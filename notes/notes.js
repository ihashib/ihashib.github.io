/* Personal study notes: progress, search and charts for the notes home and every note page.
   Reading progress is the reader's own: the "Read" ticks are kept in this browser (localStorage, key notes:<slug>:read),
   with the last topic opened (notes:<slug>:last). Nothing is sent anywhere. */
(function () {
  'use strict';
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function readSet(slug) { var o = Object.create(null); try { var s = JSON.parse(store('notes:' + slug + ':read') || '{}') || {}; Object.keys(s).forEach(function (k) { o[k] = 1; }); } catch (e) {} return o; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var C = 2 * Math.PI * 52;
  function ring(el, done, total) {
    if (!el) return;
    var p = total ? done / total : 0;
    if (!el.querySelector('svg')) el.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg><span class="lbl"></span>';
    el.querySelector('.f').style.strokeDashoffset = C * (1 - p);
    var big = el.dataset.big === '1';
    el.querySelector('.lbl').innerHTML = '<b>' + Math.round(p * 100) + '%</b>' + (big ? '<small>' + done + ' of ' + total + '</small>' : '');
    el.classList.toggle('done', total > 0 && done === total);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', done + ' of ' + total + ' groups read');
  }
  function minutes(words) { return Math.max(1, Math.round(words / 200)); }
  function hm(min) { return min < 60 ? min + ' min' : (Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '')); }

  /* ---------------- the notes home ---------------- */
  function home() {
    var data = window.NOTES || [], cards = document.getElementById('nxCards');
    var all = 0, read = 0;
    data.forEach(function (n) {
      var r = readSet(n.slug), d = n.gl.filter(function (g) { return r[g.id]; }).length;
      n.done = d; all += n.gl.length; read += d;
      var li = cards.querySelector('[data-slug="' + n.slug + '"]');
      if (!li) return;
      ring(li.querySelector('.nx-ring'), d, n.gl.length);
      var last = store('notes:' + n.slug + ':last'), lt = last && n.gl.filter(function (g) { return g.id === last; })[0];
      var c = li.querySelector('.note-continue');
      if (c) c.textContent = lt ? 'Continue: ' + lt.title + ' →' : (d ? '' : 'Start reading →');
    });
    ring(document.getElementById('nxRing'), read, all);
    var ov = document.getElementById('nxOverallText');
    if (ov) ov.innerHTML = '<b>' + (read ? read + ' topics read' : 'Not started yet') + '</b>' + (read ? 'of ' + all + ' across all notes. Keep going.' : 'Tick "Read" on a topic and your progress shows here.');

    // the chart: each note's size in topics, and how much of it is read
    var max = Math.max.apply(null, data.map(function (n) { return n.gl.length; }).concat([1]));
    var bars = document.getElementById('nxBars');
    if (bars) bars.innerHTML = data.map(function (n) {
      var t = n.gl.length;
      return '<a class="nx-bar" href="' + n.url + '"><span class="nm">' + esc(n.title) + '</span><span class="tr" role="img" aria-label="' + n.done + ' of ' + t + ' groups read"><span class="len" style="width:' + (t / max * 100) + '%"></span><span class="rd" style="width:' + (n.done / max * 100) + '%"></span></span><span class="ct">' + n.done + ' / ' + t + '</span></a>';
    }).join('');

    // subject filters and topic search
    var q = document.getElementById('nxQ'), res = document.getElementById('nxResults'), none = document.getElementById('nxNone'), subj = 'all';
    function apply() {
      var s = (q.value || '').trim().toLowerCase();
      cards.querySelectorAll('li[data-slug]').forEach(function (li) {
        var n = data.filter(function (x) { return x.slug === li.dataset.slug; })[0];
        var okS = subj === 'all' || li.dataset.subject === subj;
        var okQ = !s || (n.title + ' ' + n.blurb + ' ' + n.subject).toLowerCase().indexOf(s) >= 0 || n.topics.some(function (t) { return t.title.toLowerCase().indexOf(s) >= 0; });
        li.hidden = !(okS && okQ);
      });
      if (!s) { res.hidden = true; res.innerHTML = ''; none.hidden = true; return; }
      var hits = [];
      data.forEach(function (n) {
        if (subj !== 'all' && n.subject !== subj) return;
        n.topics.forEach(function (t) { if (t.title.toLowerCase().indexOf(s) >= 0) hits.push([n, t]); });
      });
      res.hidden = !hits.length; none.hidden = !!hits.length || !!cards.querySelector('li[data-slug]:not([hidden])');
      res.innerHTML = hits.slice(0, 30).map(function (h) {
        var i = h[1].title.toLowerCase().indexOf(s), t = h[1].title;
        var lab = esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + s.length)) + '</mark>' + esc(t.slice(i + s.length));
        return '<li><a href="' + h[0].url + '#' + h[1].id + '"><span>' + lab + '</span><small>' + esc(h[0].title) + ' · ' + esc(h[1].group) + '</small></a></li>';
      }).join('');
    }
    if (q) q.addEventListener('input', apply);
    document.querySelectorAll('.nx-filters button').forEach(function (b) {
      b.addEventListener('click', function () {
        subj = b.dataset.subject;
        document.querySelectorAll('.nx-filters button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
  }

  /* ---------------- a note page: remember the last group opened, for "Continue" on the home page ---------------- */
  function note(sec) {
    var slug = sec.dataset.note;
    [].slice.call(document.querySelectorAll('.ngrp')).forEach(function (g) { g.addEventListener('toggle', function () { if (g.open) store('notes:' + slug + ':last', g.id); }); });
  }

  function start() {
    if (document.getElementById('nxCards')) home();
    var sec = document.querySelector('section[data-note]');
    if (sec) note(sec);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
