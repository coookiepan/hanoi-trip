/* 越來越南 — 單頁 App
   路由：#/  #/itinerary  #/itinerary/3  #/history  #/history/<id>  #/nearby  #/reading  #/guide  #/guide/<id>  #/place/<id>
   所有內容都在 data.json，這支程式只負責畫出來。 */
(function () {
  'use strict';

  var DATA = null;
  var TZ = 'Asia/Ho_Chi_Minh';
  var WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var view = document.getElementById('view');
  var titleEl = document.getElementById('title');
  var backEl = document.getElementById('back');

  // ---------- 工具 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function h(strings) { var out = strings[0]; for (var i = 1; i < arguments.length; i++) out += arguments[i] + strings[i]; return out; }
  function place(id) { return DATA.places.find(function (p) { return p.id === id; }); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 2500); }

  // 河內當地時間（手機時區不管設哪裡都算對）
  function hanoiNow() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, hh: +o.hour % 24, mm: +o.minute, wd: WEEK.indexOf(o.weekday.toLowerCase()) };
  }
  function todayDayNumber() {
    var n = hanoiNow(), md = n.m + '/' + n.d;
    if (n.y !== 2026) return null;
    var day = DATA.days.find(function (d) { return d.date === md; });
    return day ? day.day : null;
  }

  // 營業時間：hours = { "mon-sun": "08:00-17:00", "sun": "休", "mon-sat": "11:30-14:00,18:00-22:00" }
  function hoursForToday(hours, wd) {
    if (!hours) return null;
    var key = WEEK[wd], found = null;
    Object.keys(hours).forEach(function (k) {
      var m = k.match(/^(\w{3})-(\w{3})$/);
      if (k === key) found = hours[k];
      else if (m && !found) {
        var a = WEEK.indexOf(m[1]), b = WEEK.indexOf(m[2]);
        var inRange = a <= b ? (wd >= a && wd <= b) : (wd >= a || wd <= b);
        if (inRange) found = hours[k];
      }
    });
    return found;
  }
  function openStatus(p) {
    if (!p.hours || !Object.keys(p.hours).length) return { cls: 'unknown', text: '營業時間待補' };
    var n = hanoiNow(), today = hoursForToday(p.hours, n.wd);
    if (!today) return { cls: 'unknown', text: '今日時間未知' };
    if (today === '休') return { cls: 'closed', text: '今天公休' };
    var cur = n.hh * 60 + n.mm, open = false;
    today.split(',').forEach(function (seg) {
      var r = seg.trim().split('-');
      var s = r[0].split(':'), e = r[1].split(':');
      var a = +s[0] * 60 + +s[1], b = +e[0] * 60 + +e[1];
      if (cur >= a && cur < b) open = true;
    });
    return open ? { cls: 'open', text: '營業中 · ' + today } : { cls: 'closed', text: '已打烊 · ' + today };
  }

  // 距離（公里）
  function distKm(a, b, c, d) {
    var R = 6371, toRad = function (x) { return x * Math.PI / 180; };
    var dLat = toRad(c - a), dLng = toRad(d - b);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function walkText(km) {
    if (km > 3) return km.toFixed(1) + ' km · 建議叫 Grab';
    var min = Math.round(km * 1000 / 80);
    return (km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km') + ' · 步行約 ' + min + ' 分';
  }

  // ---------- 畫面 ----------
  function setTitle(t, showBack) { titleEl.textContent = t; backEl.classList.toggle('show', !!showBack); }

  var ARROW_OUT = '<svg class="arrow" viewBox="0 0 56 56" fill="currentColor"><path d="M16 8h32v32h-8V21.7L15.7 46 10 40.3 34.3 16H16z"/></svg>';
  var ARROW_IN  = '<svg class="arrow" viewBox="0 0 56 56" fill="currentColor"><path d="M40 48H8V16h8v18.3L40.3 10 46 15.7 21.7 40H40z"/></svg>';
  var GO = '<span class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span>';

  function renderHome() {
    setTitle('越來越南', false);
    var today = todayDayNumber();
    var day = today && DATA.days.find(function (d) { return d.day === today; });
    var balance = day
      ? h`<a class="balance" href="#/itinerary/${day.day}"><span class="pill">${day.date}</span>
          <div class="label">今天</div><div class="big">DAY ${day.day}<small>（${day.weekday}）</small></div>
          <span class="chip">${esc(day.area)}${day.stay ? ' · 住 ' + esc(day.stay) : ''}</span></a>`
      : h`<a class="balance" href="#/itinerary"><span class="pill">2026</span>
          <div class="label">出發倒數</div><div class="big">${countdown()}<small> 天</small></div>
          <span class="chip">12/19（六）～12/27（日） · 8 晚 9 天 · 4 人</span></a>`;
    var next = '';
    if (day) {
      next = '<div class="section-title">今天的行程</div>' + day.items.slice(0, 4).map(itemHTML).join('') +
        h`<a class="btn ghost" href="#/itinerary/${day.day}">看全天</a>`;
    }
    view.innerHTML = h`
      <div class="headline">越來<br>越南 <span class="spark">✦</span></div>
      ${balance}
      <div class="grid">
        <a class="tile purple" href="#/itinerary">${ARROW_OUT}<div><div class="name">行程總表 ${GO}</div><div class="desc">每天的安排與狀態</div></div></a>
        <a class="tile lime" href="#/nearby">${ARROW_IN}<div><div class="name">附近推薦 ${GO}</div><div class="desc">景點、小吃、逛街</div></div></a>
        <a class="tile sky" href="#/history">${ARROW_OUT}<div><div class="name">歷史速查 ${GO}</div><div class="desc">從中國統治到現代</div></div></a>
        <a class="tile coral" href="#/reading">${ARROW_IN}<div><div class="name">延伸閱讀 ${GO}</div><div class="desc">大家找到的文章</div></div></a>
      </div>
      ${guideTile()}
      ${next}`;
  }
  function guideTile() {
    if (!DATA.guide) return '';
    var n = guideSections().filter(function (x) { return x.sec.num; }).length;
    var quick = [['visa', '簽證'], ['money', '認紙鈔'], ['emergency', '緊急電話'], ['city-transport', '交通'], ['menu', '看菜單'], ['phrases', '越南語']];
    return h`<div class="wide">
      <a class="wide-main" href="#/guide">
        <div><div class="name">旅遊基礎知識 ${GO}</div><div class="desc">簽證、換錢、禮儀、交通、吃什麼、越南語，共 ${n} 個主題</div></div>
        <svg class="book" viewBox="0 0 56 56" fill="currentColor"><path d="M8 10h17a4 4 0 0 1 3 1.4A4 4 0 0 1 31 10h17v34H31a3 3 0 0 0-3 2 3 3 0 0 0-3-2H8zm4 4v26h12.5c.5 0 1 .1 1.5.3V17a3 3 0 0 0-3-3zm32 0H33a3 3 0 0 0-3 3v23.3c.5-.2 1-.3 1.5-.3H44z"/></svg>
      </a>
      <div class="wide-chips">${quick.map(function (q) { return h`<a href="#/guide/${q[0]}">${q[1]}</a>`; }).join('')}</div>
    </div>`;
  }
  function countdown() {
    var n = hanoiNow();
    var ms = Date.UTC(2026, 11, 19) - Date.UTC(n.y, n.m - 1, n.d);
    return Math.max(0, Math.round(ms / 86400000));
  }

  function itemHTML(it) {
    var p = it.placeId && place(it.placeId);
    var title = p ? h`<a href="#/place/${p.id}">${esc(it.title)}</a>` : esc(it.title);
    return h`<div class="item${it.type === '餐飲' ? ' meal' : ''}">
      <div class="time">${esc(it.time)}</div>
      <div>
        <div class="title">${title}</div>
        ${it.note ? h`<div class="note">${esc(it.note)}</div>` : ''}
        <div class="badges"><span class="badge type">${esc(it.type)}</span><span class="badge s-${esc(it.status)}">${esc(it.status)}</span></div>
      </div></div>`;
  }

  function renderItinerary(dayNum) {
    setTitle('行程總表', true);
    var today = todayDayNumber();
    dayNum = +dayNum || today || 1;
    var day = DATA.days.find(function (d) { return d.day === dayNum; }) || DATA.days[0];
    var tabs = DATA.days.map(function (d) {
      return h`<a href="#/itinerary/${d.day}" class="${d.day === day.day ? 'active' : ''}">D${d.day}<small>${d.date}</small></a>`;
    }).join('');
    view.innerHTML = h`
      <div class="daytabs">${tabs}</div>
      <div class="dayhead"><h2>DAY ${day.day} · ${day.date}（${day.weekday}）${day.day === today ? ' · 今天' : ''}</h2>
        <div class="meta">${esc(day.area)}${day.stay ? ' · 住 ' + esc(day.stay) : ''}</div></div>
      ${day.items.map(itemHTML).join('')}
      <p class="notice">行程有異動請改 Google 試算表，這裡的資料會在下次更新時同步。</p>`;
    var active = view.querySelector('.daytabs .active');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // Markdown 轉 HTML（歷史頁、基礎知識共用）。先整段跳脫，再逐行組 HTML。
  // 支援：### 小標、**粗體**、`程式碼`、> 引用、- 與 1. 清單（可縮排巢狀）、| 表格 |、``` 程式碼區塊、--- 分隔、網址自動連結、⚠ 提醒
  var WARN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 1 21h22zm1 14h-2v2h2zm0-7h-2v5h2z"/></svg>';
  function mdInline(t) {
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(https?:\/\/[^\s<）」]+?)([.,，。、）]*)(?=\s|$|<)/g, function (_, url, tail) {
      var short = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      if (short.length > 36) short = short.slice(0, 34) + '…';
      return '<a href="' + url + '" target="_blank" rel="noopener">' + short + '</a>' + tail;
    });
    t = t.replace(/⚠\s*(出發前再確認)?/g, function (_, w) { return '<span class="warn">' + WARN_ICON + (w || '') + '</span>'; });
    return t;
  }
  function mdBlocks(lines) {
    var out = [], para = [], i = 0;
    function flush() { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function cells(row) { var c = row.split('|'); return c.slice(1, c.length - 1).map(function (x) { return mdInline(x.trim()); }); }
    function list() {
      var root = { children: [] }, stack = [{ node: root, indent: -1 }];
      while (i < lines.length) {
        var m = lines[i].match(/^( *)(-|\d+\.) (.*)$/);
        if (m) {
          var indent = m[1].length;
          while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
          var parent = stack[stack.length - 1].node;
          if (!parent.type) parent.type = m[2] === '-' ? 'ul' : 'ol';
          var item = { text: mdInline(m[3]), children: [] };
          parent.children.push(item); stack.push({ node: item, indent: indent }); i++;
        } else if (/^\s+\S/.test(lines[i]) && stack.length > 1) { stack[stack.length - 1].node.text += '<br>' + mdInline(lines[i].trim()); i++; }
        else break;
      }
      function render(n) { return n.children.length ? '<' + n.type + '>' + n.children.map(function (c) { return '<li>' + c.text + render(c) + '</li>'; }).join('') + '</' + n.type + '>' : ''; }
      return render(root);
    }
    while (i < lines.length) {
      var l = lines[i];
      if (/^```/.test(l)) { flush(); var code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; } i++; out.push('<pre>' + code.join('\n') + '</pre>'); }
      else if (/^#{3,4} /.test(l)) { flush(); var lvl = l.indexOf(' '); out.push('<h' + (lvl + 1) + '>' + mdInline(l.slice(lvl + 1)).replace(/^(\d+-\d+)\s+/, '<span class="no">$1</span>') + '</h' + (lvl + 1) + '>'); i++; }
      else if (/^\*\*[^*]+\*\*：?$/.test(l)) { flush(); out.push('<h5>' + mdInline(l) + '</h5>'); i++; }
      else if (/^---+$/.test(l)) { flush(); i++; }
      else if (/^&gt;/.test(l)) {
        flush(); var q = [];
        while (i < lines.length && /^&gt;/.test(lines[i])) { q.push(lines[i].replace(/^&gt; ?/, '')); i++; }
        out.push('<blockquote>' + mdBlocks(q) + '</blockquote>');
      }
      else if (/^ *(-|\d+\.) /.test(l)) { flush(); out.push(list()); }
      else if (/^\|/.test(l)) {
        flush(); var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s:|-]+\|$/.test(lines[i])) rows.push(cells(lines[i])); i++; }
        var head = rows.shift() || [];
        out.push('<div class="tablewrap"><table><thead><tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      }
      else if (!l.trim()) { flush(); i++; }
      else { para.push(mdInline(l)); i++; }
    }
    flush();
    return out.join('');
  }
  function md(src) { return mdBlocks(esc(src).split('\n')); }

  function renderHistory(openId) {
    setTitle('歷史速查', true);
    var chips = DATA.history.map(function (e) { return h`<button data-era="${e.id}">${esc(e.era)}</button>`; }).join('');
    view.innerHTML = h`<div class="chips">${chips}</div>` + DATA.history.map(function (e, idx) {
      var sites = (e.sites || []).map(function (s) {
        var p = s.placeId && place(s.placeId);
        var href = p ? '#/place/' + p.id : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.nameVn);
        var ext = p ? '' : ' target="_blank" rel="noopener"';
        return h`<a class="site" href="${href}"${ext}>
          <div class="row"><strong>${esc(s.name)}</strong><span class="badge ${p ? 's-固定' : 'type'}">${p ? '地點頁' : (s.offCity ? '河內市外' : 'Google Maps')}</span></div>
          <div class="vn">${esc(s.nameVn)}</div>
          <div class="meta">${esc(s.note)}</div></a>`;
      }).join('');
      return h`<section class="era" id="era-${e.id}">
        <div class="years">${esc(e.years)}</div>
        <h3>${esc(e.title)}</h3>
        <div class="sub">${esc(e.subtitle)}</div>
        <p class="takeaway">${esc(e.takeaway)}</p>
        <details${e.id === openId ? ' open' : ''}><summary>讀全文</summary>
          <div class="body">${md(e.body)}</div>
          ${sites ? '<div class="section-title sm">相關景點</div>' + sites : ''}
        </details>
      </section>`;
    }).join('') + '<p class="notice">內容整理自高夏《越南：世界史的失語者》（聯經，2018）。</p>';
    view.querySelectorAll('.chips button').forEach(function (b) {
      b.onclick = function () {
        var sec = document.getElementById('era-' + b.dataset.era);
        sec.querySelector('details').open = true;
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
    if (openId) { var sec = document.getElementById('era-' + openId); if (sec) sec.scrollIntoView({ block: 'start' }); }
  }

  var nearby = { cat: '全部', pos: null, err: null };
  function renderNearby() {
    setTitle('附近推薦', true);
    var cats = ['全部', '景點', '小吃', '逛街'];
    var chips = cats.map(function (c) { return h`<button data-cat="${c}" class="${nearby.cat === c ? 'active' : ''}">${c}</button>`; }).join('');
    var head = nearby.pos
      ? h`<div class="notice">已定位。距離是直線距離，實際步行會再遠一點。<button class="btn sm" id="relocate" style="margin-left:8px">重新定位</button></div>`
      : h`<div class="notice">${nearby.err ? esc(nearby.err) + '<br>' : ''}<button class="btn" id="locate">取得我的位置</button>　或先用住宿當起點：
          <button class="btn sm lime" data-from="gerbera-1">Ba Đình</button>
          <button class="btn sm lime" data-from="gerbera-2">老城區</button></div>`;
    var list = DATA.places.filter(function (p) { return p.category !== '住宿' && (nearby.cat === '全部' || p.category === nearby.cat); });
    if (nearby.pos) {
      list.forEach(function (p) { p._d = distKm(nearby.pos.lat, nearby.pos.lng, p.lat, p.lng); });
      list.sort(function (a, b) { return a._d - b._d; });
    }
    view.innerHTML = h`<div class="chips">${chips}</div>${head}` + list.map(function (p) {
      var st = openStatus(p);
      return h`<a class="card" href="#/place/${p.id}">
        <div class="row"><h3>${esc(p.name)}</h3><span class="${st.cls}">${st.text}</span></div>
        <div class="meta">${esc(p.category)} · ${esc(p.area)}${nearby.pos ? ' · ' + walkText(p._d) : ''}</div>
      </a>`;
    }).join('');
    view.querySelectorAll('.chips button').forEach(function (b) { b.onclick = function () { nearby.cat = b.dataset.cat; renderNearby(); }; });
    view.querySelectorAll('[data-from]').forEach(function (b) { b.onclick = function () { var p = place(b.dataset.from); nearby.pos = { lat: p.lat, lng: p.lng }; nearby.err = null; renderNearby(); }; });
    var loc = document.getElementById('locate') || document.getElementById('relocate');
    if (loc) loc.onclick = locate;
  }
  function locate() {
    if (!navigator.geolocation) { nearby.err = '這個瀏覽器不支援定位'; return renderNearby(); }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') { nearby.err = '定位需要用 https 網址開啟'; return renderNearby(); }
    toast('定位中…');
    navigator.geolocation.getCurrentPosition(function (r) {
      nearby.pos = { lat: r.coords.latitude, lng: r.coords.longitude }; nearby.err = null; renderNearby();
    }, function (e) {
      nearby.err = e.code === 1 ? '定位被拒絕。若是在 LINE 裡開的，請改用 Safari 或 Chrome 開啟。' : '定位失敗，請再試一次或改用住宿當起點。';
      renderNearby();
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function renderReading() {
    setTitle('延伸閱讀', true);
    view.innerHTML = DATA.reading.map(function (g) {
      return h`<div class="section-title">${esc(g.group)}</div><div class="linklist">` + g.items.map(function (l) {
        return h`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}<small>${esc(l.url)}</small></a>`;
      }).join('') + '</div>';
    }).join('');
  }

  // ---------- 基礎知識 ----------
  var TOC_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h3v3H4zm5 0h11v3H9zM4 10.5h3v3H4zm5 0h11v3H9zM4 16h3v3H4zm5 0h11v3H9z"/></svg>';
  var PART_COLORS = ['purple', 'lime', 'sky', 'coral'];
  function guideSections() { var all = []; DATA.guide.parts.forEach(function (p) { p.sections.forEach(function (sec) { all.push({ part: p, sec: sec }); }); }); return all; }
  function subheads(body) { var m = body.match(/^### .+$/gm) || []; return m.map(function (x) { return x.slice(4).replace(/^\d+-\d+\s*/, ''); }); }

  function renderGuide() {
    var g = DATA.guide;
    setTitle('基礎知識', true);
    var chips = g.parts.map(function (p) { return h`<button data-part="${p.id}">${esc(p.num)}・${esc(p.title)}</button>`; }).join('');
    var notes = g.notes.map(function (n) { return h`<li>${mdInline(esc(n))}</li>`; }).join('');
    var parts = g.parts.map(function (p, idx) {
      var rows = p.sections.map(function (sec) {
        var subs = subheads(sec.body);
        return h`<a class="guide-row" href="#/guide/${sec.id}" data-q="${esc((sec.title + ' ' + sec.body).toLowerCase())}">
          <span class="n ${PART_COLORS[idx % 4]}">${sec.num ? esc(sec.num) : '※'}</span>
          <div><div class="t">${esc(sec.title)}</div>${subs.length ? h`<div class="meta">${esc(subs.join(' · '))}</div>` : ''}</div>
          ${GO}</a>`;
      }).join('');
      return h`<section class="guide-part" id="part-${p.id}">
        <div class="part-head"><span class="num ${PART_COLORS[idx % 4]}">${esc(p.num)}</span><h3>${esc(p.title)}</h3></div>
        ${p.intro && p.intro.length ? h`<p class="part-intro">${p.intro.map(esc).join('<br>')}</p>` : ''}
        ${rows}</section>`;
    }).join('');
    view.innerHTML = h`
      <div class="guide-hero">
        <h2>${esc(g.title)}</h2>
        <ul class="notes">${notes}</ul>
        <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="guide-q" type="search" placeholder="搜尋：簽證、Grab、phở、廁所…" autocomplete="off"></label>
      </div>
      <div class="chips" id="part-chips">${chips}</div>
      ${parts}
      <p class="empty" id="guide-empty" hidden>沒有符合的主題</p>`;
    view.querySelectorAll('#part-chips button').forEach(function (b) {
      b.onclick = function () { scrollToEl(document.getElementById('part-' + b.dataset.part)); };
    });
    var q = document.getElementById('guide-q');
    q.oninput = function () {
      var kw = q.value.trim().toLowerCase(), any = false;
      view.querySelectorAll('.guide-part').forEach(function (part) {
        var shown = 0;
        part.querySelectorAll('.guide-row').forEach(function (r) { var hit = !kw || r.dataset.q.indexOf(kw) >= 0; r.hidden = !hit; if (hit) shown++; });
        part.hidden = !shown; any = any || shown > 0;
      });
      document.getElementById('part-chips').hidden = !!kw;
      document.getElementById('guide-empty').hidden = any;
    };
  }

  function renderGuideSection(id) {
    var all = guideSections(), idx = -1;
    all.forEach(function (x, i) { if (x.sec.id === id) idx = i; });
    if (idx < 0) { location.hash = '#/guide'; return; }
    var cur = all[idx], sec = cur.sec, prev = all[idx - 1], next = all[idx + 1];
    setTitle(sec.num ? sec.num + '. ' + sec.title : sec.title, true);
    view.innerHTML = h`
      <div class="guide-head"><span class="chip">${esc(cur.part.num)}・${esc(cur.part.title)}</span><h2>${esc(sec.title)}</h2></div>
      <div class="subnav chips" id="subnav" hidden></div>
      <div class="prose" id="prose">${md(sec.body)}</div>
      <div class="pager">
        ${prev ? h`<a href="#/guide/${prev.sec.id}"><small>上一節</small>${esc(prev.sec.num ? prev.sec.num + '. ' : '')}${esc(prev.sec.title)}</a>` : '<span></span>'}
        ${next ? h`<a class="next" href="#/guide/${next.sec.id}"><small>下一節</small>${esc(next.sec.num ? next.sec.num + '. ' : '')}${esc(next.sec.title)}</a>` : '<span></span>'}
      </div>
      <a class="fab" href="#/guide" aria-label="回目錄">${TOC_ICON}<span>目錄</span></a>`;
    // 段落快速導航：從 ### 小標產生膠囊，捲動時標示目前段落
    var heads = Array.prototype.slice.call(view.querySelectorAll('#prose h4'));
    if (heads.length > 1) {
      var nav = document.getElementById('subnav');
      nav.hidden = false; nav.style.top = topbarH() + 'px';
      nav.innerHTML = heads.map(function (hd, i) { hd.id = 'h-' + i; return h`<button data-h="${i}">${esc(hd.textContent.replace(/^\d+-\d+\s*/, ''))}</button>`; }).join('');
      var btns = nav.querySelectorAll('button');
      btns.forEach(function (b) { b.onclick = function () { scrollToEl(heads[+b.dataset.h]); }; });
      onScroll = function () {
        var line = topbarH() + nav.offsetHeight + 12, active = 0;
        heads.forEach(function (hd, i) { if (hd.getBoundingClientRect().top <= line) active = i; });
        btns.forEach(function (b, i) { b.classList.toggle('active', i === active); });
        var ab = btns[active]; if (ab) ab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      };
      onScroll();
    }
  }
  var onScroll = null, ticking = false;
  window.addEventListener('scroll', function () {
    if (!onScroll || ticking) return;
    ticking = true; requestAnimationFrame(function () { ticking = false; if (onScroll) onScroll(); });
  }, { passive: true });
  function topbarH() { return document.getElementById('topbar').offsetHeight; }
  function scrollToEl(el) {
    if (!el) return;
    var nav = document.getElementById('subnav');
    var offset = topbarH() + (nav && !nav.hidden ? nav.offsetHeight : 0) + 8;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && /^#\/guide\/./.test(location.hash)) location.hash = '#/guide';
  });

  function renderPlace(id) {
    var p = place(id);
    if (!p) { view.innerHTML = '<p class="loading">找不到這個地點</p>'; return setTitle('地點', true); }
    setTitle(p.name, true);
    var st = openStatus(p);
    var hours = p.hours && Object.keys(p.hours).length ? Object.keys(p.hours).map(function (k) { return k + '：' + p.hours[k]; }).join('<br>') : '待補';
    var days = DATA.days.filter(function (d) { return d.items.some(function (i) { return i.placeId === p.id; }); });
    var eras = DATA.history.filter(function (e) { return (e.sites || []).some(function (s) { return s.placeId === p.id; }); });
    var maps = 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng;
    var grab = 'https://grab.onelink.me/2695613898?pid=inappsharing&c=' + encodeURIComponent(p.name) + '&is_retargeting=true&af_dp=grab%3A%2F%2Fopen%3FscreenType%3DBOOKING%26dropOffLatitude%3D' + p.lat + '%26dropOffLongitude%3D' + p.lng;
    view.innerHTML = h`
      <div class="place-hero">
        <h2>${esc(p.name)}</h2>
        <div class="local">${esc(p.nameLocal)}</div>
        <div class="meta">${esc(p.category)} · ${esc(p.area)}${p.price ? ' · ' + esc(p.price) : ''}${p.recommendedBy ? ' · ' + esc(p.recommendedBy) + '推薦' : ''}</div>
      </div>
      <div class="card">
        <p>${esc(p.intro || '（介紹待補）')}</p>
        <div class="row"><strong>開放時間</strong><span class="${st.cls}">${st.text}</span></div>
        <div class="meta">${hours}</div>
        ${days.length ? '<div class="meta" style="margin-top:8px">排在：' + days.map(function (d) { return h`<a class="badge s-固定" href="#/itinerary/${d.day}">DAY ${d.day} ${d.date}</a>`; }).join(' ') + '</div>' : ''}
        ${eras.length ? '<div class="meta" style="margin-top:8px">歷史：' + eras.map(function (e) { return h`<a class="badge s-選項" href="#/history/${e.id}">${esc(e.era)}</a>`; }).join(' ') + '</div>' : ''}
        <div class="btnrow">
          <a class="btn lime" href="${maps}" target="_blank" rel="noopener">Google Maps 導航</a>
          <a class="btn purple" href="${grab}" target="_blank" rel="noopener">叫 Grab</a>
        </div>
        ${p.links && p.links.length ? '<div class="linklist" style="margin-top:12px">' + p.links.map(function (u) { return h`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`; }).join('') + '</div>' : ''}
      </div>`;
  }

  // ---------- 路由 ----------
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/');
    var name = parts[0] || 'home';
    document.querySelectorAll('#tabbar a').forEach(function (a) { a.classList.toggle('active', a.dataset.route === name); });
    window.scrollTo(0, 0);
    onScroll = null;
    switch (name) {
      case 'home': return renderHome();
      case 'itinerary': return renderItinerary(parts[1]);
      case 'history': return renderHistory(parts[1]);
      case 'nearby': return renderNearby();
      case 'reading': return renderReading();
      case 'guide': return parts[1] ? renderGuideSection(parts[1]) : renderGuide();
      case 'place': return renderPlace(parts[1]);
      default: location.hash = '#/';
    }
  }
  backEl.onclick = function (e) { e.preventDefault(); if (history.length > 1) history.back(); else location.hash = '#/'; };

  function tickClock() {
    var n = hanoiNow();
    document.getElementById('clock').textContent = '河內 ' + String(n.hh).padStart(2, '0') + ':' + String(n.mm).padStart(2, '0');
  }

  // ---------- 啟動 ----------
  fetch('data.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    window.addEventListener('hashchange', route);
    route();
    tickClock(); setInterval(tickClock, 30000);
  }).catch(function (e) {
    view.innerHTML = '<p class="loading">資料載入失敗。請確認是用 https 網址開啟，而不是直接開 html 檔。<br><small>' + esc(e.message) + '</small></p>';
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
