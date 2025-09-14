---

> Note: Updated to support direct SSH from the mobile app. The agent is optional. If you prefer no local agent, the app can connect to a computer on the same LAN via SSH (username/password) and present a terminal UI. The legacy agent flow remains as a fallback when using the WebSocket bridge.

# 0) What you’ll get (local MVP behavior)

1. Mobile app (Expo) sends a run request to your **backend stub**.
2. Backend forwards the run job to your **local agent** (via REST API exposed on your computer, or via SSH command).
3. Local agent:

   * Clones your repo (on your local disk)
   * Runs Codex CLI in various custom modes
   * Produces a `diff.patch` file
   * Waits for approval
   * On approval, applies patch, commits, and pushes to GitHub
4. Mobile streams logs + diff over HTTP from your laptop.
5. Whole loop proven without any cloud infra.

---

# 1) Components

**Mobile (Expo)**

* Same as cloud MVP: 3 screens (Run composer → Run detail → Diff+Approve)
* Talks to backend over LAN IP (e.g., `http://192.168.1.10:8080`)

**Backend (thin Express server, optional)**

* If you want to keep the same API shape (`/runs`, `/runs/:id/stream`, `/approve`), run a tiny Express server *on your laptop*.
* For MVP you could even **skip backend** and call agent API directly from the mobile app.

**Agent (local Node.js daemon) — optional in direct-SSH mode**

* Runs on your laptop.
* Listens on `http://0.0.0.0:8080` (so mobile devices on Wi-Fi can reach it).
* Endpoints:

  * `POST /runs` → start run locally
  * `GET /runs/:id/stream` → SSE stream of logs & state
  * `GET /runs/:id/diff` → diff file
  * `POST /runs/:id/approve` → sets approved flag

---

# 2) Flow (direct SSH execution)

1. Ensure the target computer has SSH enabled and reachable on port 22, and that your phone is on the same Wi‑Fi/LAN.
2. In the app, open SSH Terminal, enter host, username, and password, and connect. You’ll get an interactive terminal to the remote machine.

---

# 2b) Flow (agent bridge execution — legacy)

1. **Start local agent**:

   ```bash
   node agent.js
   # or pm2 start agent.js
   # expose port 8080
   ```

   Your laptop IP (check via `ifconfig` / `ipconfig`), e.g. `192.168.1.10`.

2. **Mobile app** calls:

   * `POST http://192.168.1.10:8080/runs` with `{repoUrl, branch, prompt}`
   * Receives `{runId}`.

3. **Agent process**:

   * Clones repo (or uses local copy).
   * Runs Codex CLI and perform the multifile edit and wait untile the changes are done.
   * Writes logs to memory / file.
   * Exposes diff at `/runs/:id/diff`.
   * Sets status `NEEDS_APPROVAL`.

4. **Mobile app**:

   * Polls `/runs/:id/state` or uses SSE `/stream`.
   * When status = `NEEDS_APPROVAL`, shows diff.
   * On approve, calls `POST /runs/:id/approve`.

5. **Agent resumes**:

   * Applies patch → commit → push.
   * Status → `SUCCEEDED`.

---

# 3) Agent implementation (simple Node.js)

Dependencies:

```bash
npm i express cors simple-git
```

**agent.js**

```js
const express = require('express');
const cors = require('cors');
const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const git = require('simple-git');

const app = express();
app.use(cors());
app.use(express.json());

let runs = {};

app.post('/runs', async (req,res)=>{
  const runId = Math.random().toString(36).slice(2);
  const {repoUrl, baseBranch, prompt} = req.body;
  runs[runId] = {status:'RUNNING', logs:[], approved:false, diff:null};
  
  res.json({runId});
  
  // async run
  (async()=>{
    const workDir = path.join(__dirname, 'runs', runId);
    fs.mkdirSync(workDir, {recursive:true});
    const g = git(workDir);
    runs[runId].logs.push('Cloning repo...');
    await g.clone(repoUrl, workDir);
    await g.checkout(baseBranch);
    const branch = `codex/run-${runId}`;
    await g.checkoutLocalBranch(branch);
    
    runs[runId].logs.push('Simulating Codex edit...');
    fs.appendFileSync(path.join(workDir,'README.md'),`\n\n# Codex MVP change\nPrompt: ${prompt}\n`);
    const diff = execSync(`git -C ${workDir} diff`).toString();
    runs[runId].diff = diff;
    runs[runId].status = 'NEEDS_APPROVAL';
  })();
});

app.get('/runs/:id/diff',(req,res)=>{
  const run = runs[req.params.id];
  if(!run || !run.diff) return res.status(404).send('no diff yet');
  res.type('text/plain').send(run.diff);
});

app.post('/runs/:id/approve',(req,res)=>{
  if(runs[req.params.id]) {
    runs[req.params.id].approved = true;
    runs[req.params.id].status = 'APPLYING';
    res.json({ok:true});
    
    (async()=>{
      const runId=req.params.id;
      const workDir = path.join(__dirname,'runs',runId);
      runs[runId].logs.push('Applying diff & pushing...');
      execSync(`git -C ${workDir} add -A && git -C ${workDir} commit -m "codex: change"`);
      execSync(`git -C ${workDir} push origin HEAD`);
      runs[runId].status='SUCCEEDED';
    })();
  } else {
    res.status(404).send('not found');
  }
});

app.get('/runs/:id/state',(req,res)=>{
  res.json(runs[req.params.id]||{});
});

app.get('/runs/:id/stream',(req,res)=>{
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
  const runId=req.params.id;
  let prevLogs=0;
  const interval=setInterval(()=>{
    const run = runs[runId];
    if(!run) return;
    while(prevLogs<run.logs.length){
      res.write(`event: log\ndata: ${run.logs[prevLogs++]}\n\n`);
    }
    res.write(`event: state\ndata: ${JSON.stringify(run)}\n\n`);
  },1000);
  req.on('close',()=>clearInterval(interval));
});

app.listen(8080,()=>console.log('Agent running on 0.0.0.0:8080'));
```

---

# 4) Mobile app (Expo) changes

* Hardcode backend URL = your laptop IP:

  ```js
  const BASE_URL = "http://192.168.1.10:8080";
  ```
* Same calls as before: `/runs`, `/runs/:id/stream`, `/diff`, `/approve`.
* Screens identical to cloud MVP.

---

# 5) Setup

1. Ensure your **laptop and phone are on same Wi-Fi**.
2. Start agent: `node agent.js`. Confirm it’s reachable: `curl http://192.168.1.10:8080`.
3. On mobile, open Expo app, create run, see logs.
4. Diff appears, tap **Approve**, then check GitHub repo for branch pushed.

---

# 6) Simplifications vs cloud MVP

* No Firebase, no GCS, no Run Jobs.
* State lives in memory (simple JS object).
* Logs served over SSE.
* GitHub access via local git + PAT configured in your global git config (or pass HTTPS with token inline).
* No auth, no policies — **single user only**.

---

# 7) Upgrade path

* Later replace local Express with secure channel (SSH tunnel, ngrok).
* Store state in SQLite (local) for persistence.
* Add multi-run management, cleanup workdirs, and stronger error handling.

---

👉 This MVP lets you prove the full loop (mobile → request → Codex agent on laptop → diff → approval → git push) without deploying anything to the cloud.

Do you want me to also include a **Codex CLI invocation example** inside the local agent loop (so instead of simulating with README change, it actually runs Codex CLI with your prompt)?
