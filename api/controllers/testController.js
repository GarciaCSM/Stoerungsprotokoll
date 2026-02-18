const express = require('express');

class TestController {
  constructor() {
    // simple in-memory test state (not persisted) — intended only for local/dev use
    this.state = {
      ist: 0
    };
  }

  // GET /api/test/ist
  getIst(req, res) {
    res.json({ ok: true, ist: this.state.ist });
  }

  // POST /api/test/ist       { ist: 123 }
  setIst(req, res) {
    const body = req.body || {};
    const n = Number(body.ist);
    if (Number.isNaN(n)) return res.status(400).json({ ok: false, error: 'Invalid ist value' });
    this.state.ist = n;
    return res.json({ ok: true, ist: this.state.ist });
  }

  // POST /api/test/ist/increment  { by: 1 }
  incrementIst(req, res) {
    const body = req.body || {};
    const by = typeof body.by === 'number' ? body.by : 1;
    const add = Number(by) || 1;
    this.state.ist = (Number(this.state.ist) || 0) + add;
    return res.json({ ok: true, ist: this.state.ist });
  }
}

module.exports = new TestController();
