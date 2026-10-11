/* 越來越南 — 單頁 App
   路由：#/  #/itinerary  #/itinerary/3  #/history  #/nearby  #/reading  #/place/<id>
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

  function renderHome() {
    setTitle('越來越南', false);
    var today = todayDayNumber();
    var day = today && DATA.days.find(function (d) { return d.day === today; });
    var hero = day
      ? h`<div class="big">DAY ${day.day} · ${day.date}（${day.weekday}）</div><div class="sub">${esc(day.area)}${day.stay ? ' · 住 ' + esc(day.stay) : ''}</div>`
      : h`<div class="big">${esc(DATA.trip.title)}</div><div class="sub">2026/12/19（六）～12/27（日）· 8 晚 9 天 · 4 人</div>`;
    var next = '';
    if (day) {
      next = '<div class="section-title">今天的行程</div>' + day.items.slice(0, 4).map(itemHTML).join('') +
        h`<a class="btn ghost" href="#/itinerary/${day.day}">看全天</a>`;
    }
    view.innerHTML = h`
      <a class="hero" href="${day ? '#/itinerary/' + day.day : '#/itinerary'}">${hero}</a>
      <div class="grid">
        <a class="tile" href="#/itinerary"><div class="icon">📅</div><div class="name">行程總表</div><div class="desc">每天的安排與狀態</div></a>
        <a class="tile" href="#/history"><div class="icon">📜</div><div class="name">歷史速查</div><div class="desc">從中國統治到現代</div></a>
        <a class="tile" href="#/nearby"><div class="icon">📍</div><div class="name">附近推薦</div><div class="desc">景點、小吃、逛街</div></a>
        <a class="tile" href="#/reading"><div class="icon">🔗</div><div class="name">延伸閱讀</div><div class="desc">大家找到的文章</div></a>
      </div>
      ${next}`;
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

  function renderHistory() {
    setTitle('歷史速查', true);
    view.innerHTML = DATA.history.map(function (e) {
      var links = (e.places || []).map(function (id) { var p = place(id); return p ? h`<a class="badge type" href="#/place/${p.id}">${esc(p.name)}</a>` : ''; }).join(' ');
      return h`<div class="era"><h3>${esc(e.era)}</h3><div class="years">${esc(e.years)}</div><p>${esc(e.summary)}</p><div class="badges">${links}</div></div>`;
    }).join('');
  }

  var nearby = { cat: '全部', pos: null, err: null };
  function renderNearby() {
    setTitle('附近推薦', true);
    var cats = ['全部', '景點', '小吃', '逛街'];
    var chips = cats.map(function (c) { return h`<button data-cat="${c}" class="${nearby.cat === c ? 'active' : ''}">${c}</button>`; }).join('');
    var head = nearby.pos
      ? h`<div class="notice">已定位。距離是直線距離，實際步行會再遠一點。<button class="btn ghost" id="relocate" style="padding:4px 10px;margin-left:8px">重新定位</button></div>`
      : h`<div class="notice">${nearby.err ? esc(nearby.err) + '<br>' : ''}<button class="btn" id="locate">取得我的位置</button>　或先用住宿當起點：
          <button class="btn ghost" data-from="gerbera-1" style="padding:6px 10px">Ba Đình</button>
          <button class="btn ghost" data-from="gerbera-2" style="padding:6px 10px">老城區</button></div>`;
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

  function renderPlace(id) {
    var p = place(id);
    if (!p) { view.innerHTML = '<p class="loading">找不到這個地點</p>'; return setTitle('地點', true); }
    setTitle(p.name, true);
    var st = openStatus(p);
    var hours = p.hours && Object.keys(p.hours).length ? Object.keys(p.hours).map(function (k) { return k + '：' + p.hours[k]; }).join('<br>') : '待補';
    var days = DATA.days.filter(function (d) { return d.items.some(function (i) { return i.placeId === p.id; }); });
    var maps = 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng;
    var grab = 'https://grab.onelink.me/2695613898?pid=inappsharing&c=' + encodeURIComponent(p.name) + '&is_retargeting=true&af_dp=grab%3A%2F%2Fopen%3FscreenType%3DBOOKING%26dropOffLatitude%3D' + p.lat + '%26dropOffLongitude%3D' + p.lng;
    view.innerHTML = h`
      <div class="card">
        <h3>${esc(p.name)}</h3>
        <div class="meta">${esc(p.nameLocal)}</div>
        <div class="meta">${esc(p.category)} · ${esc(p.area)}${p.price ? ' · ' + esc(p.price) : ''}${p.recommendedBy ? ' · ' + esc(p.recommendedBy) + '推薦' : ''}</div>
        <p>${esc(p.intro || '（介紹待補）')}</p>
        <div class="row"><strong>開放時間</strong><span class="${st.cls}">${st.text}</span></div>
        <div class="meta">${hours}</div>
        ${days.length ? '<div class="meta" style="margin-top:8px">排在：' + days.map(function (d) { return h`<a class="badge s-固定" href="#/itinerary/${d.day}">DAY ${d.day} ${d.date}</a>`; }).join(' ') + '</div>' : ''}
        <div class="btnrow">
          <a class="btn" href="${maps}" target="_blank" rel="noopener">Google Maps 導航</a>
          <a class="btn ghost" href="${grab}" target="_blank" rel="noopener">叫 Grab</a>
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
    switch (name) {
      case 'home': return renderHome();
      case 'itinerary': return renderItinerary(parts[1]);
      case 'history': return renderHistory();
      case 'nearby': return renderNearby();
      case 'reading': return renderReading();
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
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
