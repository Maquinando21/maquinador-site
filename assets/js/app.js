(() => {
  const FAV_KEY = 'mar_favs_v1';
  const state = {
    products: [],
    categorias: [],
    categoriasMap: {},   // slug -> {nome, grupo}
    activeCat: 'todas',
    activeGrupo: 'todos', // 'todos' | 'ferramentas' | 'maquinas'
    priceMin: null,
    priceMax: null,
    sources: new Set(['mercadolivre','shopee','aliexpress','outros']),
    search: '',
    onlyFavs: false,
    favs: new Set(),
  };

  try { state.favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch(e){}

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const fmtBR = n => (typeof n === 'number' && !Number.isNaN(n))
    ? n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
    : '—';

  const srcLabel = s => ({mercadolivre:'Mercado Livre', shopee:'Shopee', aliexpress:'AliExpress', outros:'Loja Oficial'}[s] || s);
  const srcClass = s => ({mercadolivre:'ml', shopee:'shopee', aliexpress:'aliexpress'}[s] || '');

  async function loadData(){
    try{
      const res = await fetch('products.json?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.categorias = data.categorias || [];
      state.categoriasMap = {};
      state.categorias.forEach(c => { state.categoriasMap[c.slug] = c; });
      state.products = (data.products || []).map(p => ({
        id: p.id,
        nome: p.nome || '',
        categoria: p.categoria || 'outros',
        grupo: (state.categoriasMap[p.categoria]?.grupo) || 'maquinas',
        preco: typeof p.preco === 'number' ? p.preco : null,
        preco_data: p.preco_data || '',
        imagem: p.imagem || '',
        link_afiliado: p.link_afiliado || '',
        fonte: (p.fonte || 'mercadolivre').toLowerCase(),
      }));
      $('#lastUpdate').textContent = data.ultima_atualizacao ? `Atualizado em ${data.ultima_atualizacao}` : '';
    }catch(err){
      console.error('[loadData]', err);
      $('#grid').innerHTML = '<p class="muted">Produtos ainda não foram cadastrados. Edite <code>products.json</code>.</p>';
    }
  }

  function renderCatStrip(){
    const strip = $('#catStrip');
    const list = $('#catFilterList');
    const all = [{slug:'todas', nome:'Todas'}, ...state.categorias];
    strip.innerHTML = all.map(c =>
      `<button class="cat-chip${c.slug===state.activeCat?' active':''}" type="button" data-cat="${c.slug}">${c.nome}</button>`
    ).join('');
    list.innerHTML = all.map(c =>
      `<li><label><input type="radio" name="catf" value="${c.slug}" ${c.slug===state.activeCat?'checked':''}> ${c.nome}</label></li>`
    ).join('');

    strip.querySelectorAll('.cat-chip').forEach(b => b.addEventListener('click', () => {
      state.activeCat = b.dataset.cat;
      state.activeGrupo = 'todos';
      syncCatUI();
      renderGrid();
      updateShopTitle();
      document.getElementById('ofertas')?.scrollIntoView({behavior:'smooth', block:'start'});
    }));
    list.querySelectorAll('input[name=catf]').forEach(r => r.addEventListener('change', () => {
      state.activeCat = r.value;
      syncCatUI();
      renderGrid();
      updateShopTitle();
    }));
  }

  function syncCatUI(){
    $$('.cat-chip').forEach(b => b.classList.toggle('active', b.dataset.cat === state.activeCat));
    $$('input[name=catf]').forEach(r => { r.checked = r.value === state.activeCat; });
    $$('input[name=grupof]').forEach(r => { r.checked = r.value === state.activeGrupo; });
  }

  function updateShopTitle(){
    const el = $('#shopTitle');
    if (!el) return;
    if (state.activeCat !== 'todas') {
      const cat = state.categoriasMap[state.activeCat];
      el.textContent = cat ? cat.nome : 'Produtos';
    } else if (state.activeGrupo === 'ferramentas') {
      el.textContent = '🔧 Ferramentas';
    } else if (state.activeGrupo === 'maquinas') {
      el.textContent = '⚙️ Máquinas';
    } else {
      el.textContent = 'Todos os Produtos';
    }
  }

  function filtered(){
    const q = state.search.trim().toLowerCase();
    return state.products.filter(p => {
      if (state.activeGrupo !== 'todos' && p.grupo !== state.activeGrupo) return false;
      if (state.activeCat !== 'todas' && p.categoria !== state.activeCat) return false;
      if (!state.sources.has(p.fonte)) return false;
      if (state.priceMin != null && (p.preco == null || p.preco < state.priceMin)) return false;
      if (state.priceMax != null && (p.preco == null || p.preco > state.priceMax)) return false;
      if (state.onlyFavs && !state.favs.has(p.id)) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function buildCard(p){
    const tpl = $('#cardTpl');
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    const img = node.querySelector('.card-img img');
    const imgA = node.querySelector('.card-img');
    const title = node.querySelector('.card-title a');
    const buy = node.querySelector('.btn-buy');
    const price = node.querySelector('.price');
    const priceDate = node.querySelector('.price-date');
    const badge = node.querySelector('.src-badge');
    const fav = node.querySelector('.fav');

    img.src = p.imagem || 'assets/img/placeholder.svg';
    img.alt = p.nome;
    imgA.href = p.link_afiliado || '#';
    title.textContent = p.nome;
    title.href = p.link_afiliado || '#';
    buy.href = p.link_afiliado || '#';
    buy.textContent = 'Ver Oferta →';
    price.textContent = fmtBR(p.preco);
    priceDate.textContent = p.preco_data ? `Preço consultado em ${p.preco_data}` : '';
    badge.textContent = srcLabel(p.fonte);
    badge.className = 'src-badge ' + srcClass(p.fonte);

    if (state.favs.has(p.id)) fav.classList.add('on');
    fav.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleFav(p.id, fav);
    });

    return node;
  }

  function renderGrid(){
    const grid = $('#grid');
    const items = filtered();
    $('#resultCount').textContent = items.length ? `${items.length} produto${items.length>1?'s':''}` : '';
    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = '<p class="muted">Nenhum produto encontrado com esses filtros.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(p => frag.appendChild(buildCard(p)));
    grid.appendChild(frag);
  }

  function renderFerramentasSection(){
    const grid = $('#gridFerramentas');
    if (!grid) return;
    const items = state.products.filter(p => p.grupo === 'ferramentas').slice(0, 6);
    grid.innerHTML = '';
    items.forEach(p => grid.appendChild(buildCard(p)));
  }

  function renderMaisVendidosSection(){
    const grid = $('#gridMaisVendidos');
    if (!grid) return;
    // "Mais vendidos" = primeiras máquinas do grupo maquinas
    const items = state.products.filter(p => p.grupo === 'maquinas').slice(0, 6);
    grid.innerHTML = '';
    items.forEach(p => grid.appendChild(buildCard(p)));
  }

  function toggleFav(id, el){
    if (state.favs.has(id)) { state.favs.delete(id); el.classList.remove('on'); }
    else { state.favs.add(id); el.classList.add('on'); }
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs])); } catch(e){}
    if (state.onlyFavs) renderGrid();
  }

  function wireUI(){
    // Busca - funciona com cada tecla digitada
    const qInput = $('#q');
    qInput.addEventListener('input', e => {
      state.search = e.target.value || '';
      renderGrid();
      // Scroll ao grid se ainda não visível
      if (state.search.length > 0) {
        const g = document.getElementById('ofertas');
        if (g && window.scrollY < g.offsetTop - 200) {
          g.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    // Preço
    $('#priceMin').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      state.priceMin = isNaN(v) ? null : v;
      renderGrid();
    });
    $('#priceMax').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      state.priceMax = isNaN(v) ? null : v;
      renderGrid();
    });

    // Fontes
    $$('.src-chk').forEach(c => c.addEventListener('change', () => {
      state.sources = new Set($$('.src-chk').filter(x => x.checked).map(x => x.value));
      renderGrid();
    }));

    // Favoritos
    $('#onlyFavs').addEventListener('change', e => {
      state.onlyFavs = e.target.checked;
      renderGrid();
    });

    // Grupo (Ferramentas / Máquinas / Todos)
    $$('input[name=grupof]').forEach(r => r.addEventListener('change', () => {
      state.activeGrupo = r.value;
      state.activeCat = 'todas';
      syncCatUI();
      renderGrid();
      updateShopTitle();
    }));

    // Limpar filtros
    $('#clearFilters').addEventListener('click', () => {
      state.activeCat = 'todas';
      state.activeGrupo = 'todos';
      state.priceMin = state.priceMax = null;
      state.sources = new Set(['mercadolivre','shopee','aliexpress','outros']);
      state.onlyFavs = false;
      state.search = '';
      qInput.value = '';
      $('#priceMin').value = '';
      $('#priceMax').value = '';
      $$('.src-chk').forEach(c => c.checked = true);
      $('#onlyFavs').checked = false;
      syncCatUI();
      renderGrid();
      updateShopTitle();
    });

    // Mobile filters
    $('#openFilters').addEventListener('click', () => $('#filters').classList.add('open'));
    $('#closeFilters').addEventListener('click', () => $('#filters').classList.remove('open'));
    $('#menuToggle').addEventListener('click', () => {
      document.getElementById('catMenu').scrollIntoView({ behavior: 'smooth' });
    });

    // Big-cats - clique no bloco Ferramentas/Máquinas
    $$('.big-cat').forEach(el => {
      el.addEventListener('click', e => {
        const grupo = el.dataset.grupo;
        if (!grupo) return;
        e.preventDefault();
        state.activeGrupo = grupo;
        state.activeCat = 'todas';
        syncCatUI();
        renderGrid();
        updateShopTitle();
        location.hash = 'grupo=' + grupo;
        document.getElementById('ofertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Back to top
    const backTop = $('#backTop');
    window.addEventListener('scroll', () => {
      backTop.hidden = window.scrollY < 600;
    });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Deep link via hash
    const applyHash = () => {
      const grupo = /grupo=([^&]+)/.exec(location.hash);
      const cat = /categoria=([^&]+)/.exec(location.hash);
      if (grupo) {
        state.activeGrupo = decodeURIComponent(grupo[1]);
        state.activeCat = 'todas';
      } else if (cat) {
        const slug = decodeURIComponent(cat[1]);
        if (state.categoriasMap[slug]) {
          state.activeCat = slug;
          state.activeGrupo = 'todos';
        }
      }
      syncCatUI();
      renderGrid();
      updateShopTitle();
    };
    window.addEventListener('hashchange', applyHash);
    if (location.hash) applyHash();

    $('#yr').textContent = new Date().getFullYear();
  }

  (async function init(){
    await loadData();
    renderCatStrip();
    wireUI();
    renderFerramentasSection();
    renderMaisVendidosSection();
    renderGrid();
    updateShopTitle();
  })();
})();
