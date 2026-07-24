// Food finder: one small state machine. Each screen knows how to render itself
// into #food-finder-app and what to do with the six input keys.
//
//   menu -> quiz -> vs (searching) -> results -> winner
//     \-> saved -> detail (rate / remove)
//
// The flow's payoff: on the results screen the A button SELECTS a restaurant
// (wins the battle). That auto-adds it to your saved fighters and shows a
// WINNER screen. Later, in the saved list, you rate each place after eating.
//
// Data flows one way: a key press mutates state, then render() redraws the
// whole panel from state, so the screen can never drift out of sync.

const FoodFinder = (() => {
    const SAVED_KEY = 'savedRestaurants';

    let root = null;
    let screen = 'menu';       // menu | quiz | vs | results | winner | saved | detail
    let sel = 0;               // highlighted index on list/grid screens
    let nodeId = QUIZ_START_NODE;
    let path = [];             // answers so far: [{ nodeId, optionIndex }]
    let results = [];
    let winnerPlace = null;    // the restaurant shown on the winner screen
    let savedIndex = 0;        // which saved restaurant the detail screen edits
    let detailRow = 0;         // detail screen focus: 0 = rating, 1 = remove
    let searchToken = 0;       // ignores stale search results after cancel

    // ---- saved restaurants (localStorage) ----
    // Each saved record is a place object plus myRating (0 = not rated yet).

    function getSaved() {
        try { return JSON.parse(localStorage.getItem(SAVED_KEY)) ?? []; }
        catch { return []; }
    }
    const setSaved = list => localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    const isSaved = id => getSaved().some(p => p.id === id);

    function addSaved(place) {
        if (isSaved(place.id)) return;
        const saved = getSaved();
        saved.push({ ...place, myRating: 0 });
        setSaved(saved);
    }

    function removeSaved(id) {
        setSaved(getSaved().filter(p => p.id !== id));
    }

    function setMyRating(id, stars) {
        const saved = getSaved();
        const rec = saved.find(p => p.id === id);
        if (!rec) return;
        rec.myRating = stars;
        setSaved(saved);
    }

    // ---- quiz walking ----

    const currentNode = () => QUIZ[nodeId];
    const chosenOptions = () => path.map(p => QUIZ[p.nodeId].options[p.optionIndex]);
    const mergedFilters = () => Object.assign({}, ...chosenOptions().map(o => o.filters));

    function startQuiz() {
        nodeId = QUIZ_START_NODE;
        path = [];
        setScreen('quiz');
    }

    async function runSearch() {
        setScreen('vs');
        const token = ++searchToken;
        const [found] = await Promise.all([
            searchRestaurants(mergedFilters()),
            new Promise(r => setTimeout(r, 900)),    // vs screen lands its punch
        ]);
        if (token !== searchToken || screen !== 'vs') return;
        results = found;
        setScreen('results');
    }

    // ---- shared state helpers ----

    function setScreen(next, index = 0) {
        screen = next;
        sel = index;
        render();
    }

    function moveList(key, count) {
        if (key === 'ArrowUp' && sel > 0) sel--;
        if (key === 'ArrowDown' && sel < count - 1) sel++;
    }

    function moveGrid(key, count, cols) {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[key];
        if (step === undefined) return;
        const next = sel + step;
        if (next >= 0 && next < count) sel = next;
    }

    // ---- input, per screen ----

    function onKey(key) {
        const handlers = {
            menu: menuKey, quiz: quizKey, vs: vsKey,
            results: resultsKey, winner: winnerKey, saved: savedKey, detail: detailKey,
        };
        handlers[screen]?.(key);
    }

    function menuKey(key) {
        if (key === 'Enter') {
            if (sel === 0) startQuiz(); else setScreen('saved');
            return;
        }
        moveList(key, 2);
        render();
    }

    function quizKey(key) {
        const node = currentNode();
        if (key === 'Enter') {
            const option = node.options[sel];
            path.push({ nodeId, optionIndex: sel });
            if (option.next) {
                nodeId = option.next;
                sel = 0;
                render();
            } else {
                runSearch();
            }
            return;
        }
        if (key === 'Escape') {
            const prev = path.pop();
            if (prev) {
                nodeId = prev.nodeId;
                sel = prev.optionIndex;
                render();
            } else {
                setScreen('menu');
            }
            return;
        }
        moveGrid(key, node.options.length, 3);
        render();
    }

    function vsKey(key) {
        if (key === 'Escape') {
            searchToken++;    // abandon the in-flight search
            setScreen('menu');
        }
    }

    function resultsKey(key) {
        if (key === 'Escape') { setScreen('menu'); return; }
        if (!results.length) {
            if (key === 'Enter') setScreen('menu');
            return;
        }
        if (key === 'Enter') {
            winnerPlace = results[sel];    // this fighter wins the battle
            addSaved(winnerPlace);         // ...and joins your saved team
            setScreen('winner');
            return;
        }
        moveList(key, results.length);
        render();
    }

    function winnerKey(key) {
        if (key === 'Enter') setScreen('saved');       // A: go see your team
        if (key === 'Escape') setScreen('results', sel); // B: back to pick another
    }

    function savedKey(key) {
        const saved = getSaved();
        if (key === 'Escape') { setScreen('menu'); return; }
        if (!saved.length) return;
        if (key === 'Enter') {
            savedIndex = sel;
            detailRow = 0;
            setScreen('detail');
            return;
        }
        moveList(key, saved.length);
        render();
    }

    function detailKey(key) {
        const saved = getSaved();
        const p = saved[savedIndex];
        if (!p) { setScreen('saved'); return; }

        if (key === 'Escape') { setScreen('saved', savedIndex); return; }
        if (key === 'ArrowUp' && detailRow > 0) { detailRow--; render(); return; }
        if (key === 'ArrowDown' && detailRow < 1) { detailRow++; render(); return; }

        if (detailRow === 0 && (key === 'ArrowLeft' || key === 'ArrowRight')) {
            const cur = p.myRating || 0;
            const next = Math.max(0, Math.min(5, cur + (key === 'ArrowRight' ? 1 : -1)));
            setMyRating(p.id, next);      // persists immediately
            render();
            return;
        }
        if (key === 'Enter') {
            if (detailRow === 1) {         // remove fighter
                removeSaved(p.id);
                const len = getSaved().length;
                setScreen('saved', Math.max(0, Math.min(savedIndex, len - 1)));
            } else {                       // done rating
                setScreen('saved', savedIndex);
            }
        }
    }

    // ---- rendering ----

    const esc = s => String(s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const fmtDistance = m => m == null ? '' : m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
    const fmtPrice = p => p ? '$'.repeat(p) : '$?';
    const hpClass = r => r >= 4.2 ? 'hp-high' : r >= 3.5 ? 'hp-mid' : 'hp-low';
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

    function render() {
        const screens = {
            menu: renderMenu, quiz: renderQuiz, vs: renderVS,
            results: renderResults, winner: renderWinner, saved: renderSaved, detail: renderDetail,
        };
        root.innerHTML = screens[screen]();
        root.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
    }

    const hintBar = text => `<div class="hint-bar">${text}</div>`;

    function renderMenu() {
        const items = ['find restaurant', `saved restaurants (${getSaved().length})`];
        return `<div class="ff-screen">
            <div class="ff-menu-list">
                ${items.map((label, i) =>
                    `<div class="parallelogram ${i === sel ? 'selected' : ''}"><span>${label}</span></div>`
                ).join('')}
            </div>
            ${hintBar('&#8597; move &nbsp;&nbsp; [a] select')}
        </div>`;
    }

    function renderQuiz() {
        const node = currentNode();
        return `<div class="ff-screen">
            <div class="round-banner">round ${node.round}</div>
            <div class="question">${esc(node.question)}</div>
            <div class="option-grid">
                ${node.options.map((o, i) => `
                    <div class="option-card ${i === sel ? 'selected' : ''}">
                        <div class="opt-label">${esc(o.label)}</div>
                        <div class="opt-caption">${esc(o.caption)}</div>
                    </div>`).join('')}
            </div>
            ${hintBar('&#8596;&#8597; move &nbsp;&nbsp; [a] select &nbsp;&nbsp; [b] back')}
        </div>`;
    }

    function renderVS() {
        const tags = chosenOptions().map(o => esc(o.label)).join(' &middot; ');
        return `<div class="ff-screen vs-screen">
            <div class="vs-row"><span class="vs-you">you</span><span class="vs-vs">vs</span><span class="vs-foe">hunger</span></div>
            <div class="vs-tags">${tags}</div>
            <div class="fight-flash">fight!</div>
        </div>`;
    }

    // A place card. context 'results' shows an "in team" tag if already picked;
    // context 'saved' shows your own rating below the stats.
    function placeCard(p, selected, context) {
        const tag = context === 'results' && isSaved(p.id)
            ? '<span class="rc-star">&#9733; in team</span>' : '';
        const mine = context === 'saved'
            ? `<div class="rc-myrating">${p.myRating ? 'your rating ' + stars(p.myRating) : 'rate after your meal'}</div>` : '';
        return `<div class="result-card ${selected ? 'selected' : ''}">
            <div class="rc-top"><span class="rc-name">${esc(p.name)}</span>${tag}</div>
            <div class="hp-track"><div class="hp-fill ${hpClass(p.rating)}" style="width:${(p.rating / 5) * 100}%"></div></div>
            <div class="rc-meta">
                <span>${p.rating ? p.rating.toFixed(1) : '?'}&#9733; (${p.ratingCount || 0})</span>
                <span>${fmtPrice(p.price)}</span>
                <span>${fmtDistance(p.distance)}</span>
            </div>
            ${selected ? `<div class="rc-address">${esc(p.address)}</div>` : ''}
            ${mine}
        </div>`;
    }

    function renderResults() {
        if (!results.length) {
            return `<div class="ff-screen">
                <div class="question">no challengers found</div>
                <div class="empty-note">try a bigger hunger or another cuisine</div>
                ${hintBar('[a] or [b] back')}
            </div>`;
        }
        return `<div class="ff-screen list-screen">
            <div class="results-title">${results.length} challenger${results.length === 1 ? '' : 's'} found</div>
            <div class="card-list">
                ${results.map((p, i) => placeCard(p, i === sel, 'results')).join('')}
            </div>
            ${hintBar('&#8597; move &nbsp;&nbsp; [a] fight! &nbsp;&nbsp; [b] menu')}
        </div>`;
    }

    function renderWinner() {
        const p = winnerPlace;
        return `<div class="ff-screen winner-screen">
            <div class="winner-banner">winner</div>
            <div class="winner-name">${esc(p.name)}</div>
            <div class="winner-address">${esc(p.address)}</div>
            <div class="winner-saved">&#9733; added to your saved fighters</div>
            ${hintBar('[a] saved list &nbsp;&nbsp; [b] more results')}
        </div>`;
    }

    function renderSaved() {
        const saved = getSaved();
        if (!saved.length) {
            return `<div class="ff-screen">
                <div class="question">no saved fighters</div>
                <div class="empty-note">pick a winner from the results screen</div>
                ${hintBar('[b] back')}
            </div>`;
        }
        return `<div class="ff-screen list-screen">
            <div class="results-title">saved fighters</div>
            <div class="card-list">
                ${saved.map((p, i) => placeCard(p, i === sel, 'saved')).join('')}
            </div>
            ${hintBar('&#8597; move &nbsp;&nbsp; [a] open &nbsp;&nbsp; [b] menu')}
        </div>`;
    }

    function renderDetail() {
        const p = getSaved()[savedIndex];
        if (!p) return renderSaved();
        const rating = p.myRating || 0;
        return `<div class="ff-screen detail-screen">
            <div class="winner-name">${esc(p.name)}</div>
            <div class="winner-address">${esc(p.address)}</div>
            <div class="detail-row ${detailRow === 0 ? 'selected' : ''}">
                <span class="detail-label">your rating</span>
                <span class="detail-stars">&#9664; ${stars(rating)} &#9654;</span>
            </div>
            <div class="detail-row remove-row ${detailRow === 1 ? 'selected' : ''}">
                <span class="detail-label">remove fighter</span>
            </div>
            ${hintBar('&#8597; row &nbsp; &#8596; rate &nbsp; [a] confirm &nbsp; [b] back')}
        </div>`;
    }

    // ---- public api (what AppShell sees) ----

    return {
        title: 'food finder',
        init() {
            root = document.getElementById('food-finder-app');
            render();
        },
        onShow() { render(); },
        onKey,
    };
})();
