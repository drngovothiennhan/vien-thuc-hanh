// Âm thanh tổng hợp mô phỏng tiếng tim và tiếng phổi BÌNH THƯỜNG để học tập.
// Đây KHÔNG phải ghi âm thật. Chưa có tiếng bệnh lý (thổi tim, ran phổi).
// Chuyên môn cần kiểm định trước khi đưa cho học viên.
(function () {
  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var session = null; // { out, timer }
  var volume = 0.8;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      var len = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // Một tiếng ngắn: nhiễu lọc, có đường bao tăng-giảm.
  function burst(out, t, o) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.value = o.freq;
    f.Q.value = o.q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }

  // Tim: S1 ("lub") và S2 ("dub"). Mỗi vị trí có trọng số S1, S2 khác nhau.
  function scheduleHeart(out, t, p) {
    if (p.s1 > 0) {
      burst(out, t, { type: "lowpass", freq: 150, q: 0.7, attack: 0.015, dur: 0.14, gain: 0.9 * p.s1 });
    }
    if (p.s2 > 0) {
      burst(out, t + 0.32, { type: "lowpass", freq: 220, q: 0.8, attack: 0.012, dur: 0.1, gain: 0.6 * p.s2 });
    }
  }

  // Phổi: một nhịp thở gồm thì hít vào (dài hơn, rõ hơn) và thì thở ra (nhẹ hơn).
  function scheduleBreath(out, t, period) {
    var insp = period * 0.45;
    var exp = period - insp;
    burst(out, t, { type: "bandpass", freq: 600, q: 0.5, attack: insp * 0.6, dur: insp, gain: 0.5 });
    burst(out, t + insp, { type: "bandpass", freq: 400, q: 0.5, attack: 0.05, dur: exp, gain: 0.18 });
  }

  function stop() {
    if (!session) return;
    clearInterval(session.timer);
    var s = session;
    session = null;
    if (ctx) {
      s.out.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(function () {
        try { s.out.disconnect(); } catch (e) { /* đã ngắt */ }
      }, 300);
    }
  }

  // point: { kind: "heart", bpm, s1, s2 } hoặc { kind: "lung", breathPeriod }
  function start(point) {
    if (!ensure()) return false;
    stop();
    var out = ctx.createGain();
    out.gain.value = volume;
    out.connect(master);

    var next = ctx.currentTime + 0.05;
    function tick() {
      while (next < ctx.currentTime + 0.6) {
        if (point.kind === "heart") {
          scheduleHeart(out, next, point);
          next += 60 / point.bpm;
        } else {
          scheduleBreath(out, next, point.breathPeriod);
          next += point.breathPeriod;
        }
      }
    }
    tick();
    session = { out: out, timer: setInterval(tick, 100) };
    return true;
  }

  function setVolume(v) {
    volume = v;
    if (session) session.out.gain.value = v;
  }

  window.VTHSound = {
    start: start,
    stop: stop,
    setVolume: setVolume,
    isPlaying: function () { return !!session; }
  };
})();
