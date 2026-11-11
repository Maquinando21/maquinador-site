(() => {
  const FAV_KEY = 'mar_favs_v1';
  const state = {
    products: [],
    categories: [],
    activeCat: 'todas',
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
      const res = await fetch('products.json', {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      state.products = (data.products || []).map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria || 'outros',
        preco: typeof p.preco === 'number' ? p.preco : null,
        preco_data: p.preco_data || '',
        imagem: p.imagem || '',
        link_afiliado: p.link_afiliado || '',
        fonte: (p.fonte || 'mercadolivre').toLowerCase(),
        ranking: p.ranking || null,
      }));
      state.categories = data.categorias || [];
      $('#lastUpdate').textContent = data.ultima_atualizacao ? `Atualizado em ${data.ultima_atualizacao}` : '';
    }catch(err){
      console.error(err);
      $('#grid').innerHTML = '<p class="muted">Produtos ainda não foram cadastrados. Edite <code>products.json</code>.</p>';
    }
  }

  function renderCatStrip(){
    const strip = $('#catStrip');
    const list = $('#catFilterList');
    const all = [{slug:'todas', nome:'Todas'}, ...state.categories];
    strip.innerHTML = all.map(c =>
      `<button class="cat-chip${c.slug===state.activeCat?' active':''}" data-cat="${c.slug}">${c.nome}</button>`
    ).join('');
    list.innerHTML = all.map(c =>
      `<li><label><input type="radio" name="catf" value="${c.slug}" ${c.slug===state.activeCat?'checked':''}> ${c.nome}</label></li>`
    ).join('');

    strip.querySelectorAll('.cat-chip').forEach(b => b.addEventListener('click', () => {
      state.activeCat = b.dataset.cat;
      syncCatUI();
      renderGrid();
      document.getElementById('ofertas')?.scrollIntoView({behavior:'smooth', block:'start'});
    }));
    list.querySelectorAll('input[name=catf]').forEach(r => r.addEventListener('change', () => {
      state.activeCat = r.value; syncCatUI(); renderGrid();
    }));
  }

  function syncCatUI(){
    $$('.cat-chip').forEach(b => b.classList.toggle('active', b.dataset.cat === state.activeCat));
    $$('input[name=catf]').forEach(r => { r.checked = r.value === state.activeCat; });
  }

  function filtered(){
    const q = state.search.trim().toLowerCase();
    return state.products.filter(p => {
      if(state.activeCat !== 'todas' && p.categoria !== state.activeCat) return false;
      if(!state.sources.has(p.fonte)) return false;
      if(state.priceMin!=null && (p.preco==null || p.preco < state.priceMin)) return false;
      if(state.priceMax!=null && (p.preco==null || p.preco > state.priceMax)) return false;
      if(state.onlyFavs && !state.favs.has(p.id)) return false;
      if(q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderGrid(){
    const grid = $('#grid');
    const tpl = $('#cardTpl');
    const items = filtered();
    $('#resultCount').textContent = items.length ? `${items.length} produto${items.length>1?'s':''}` : '';
    grid.innerHTML = '';
    if(!items.length){
      grid.innerHTML = '<p class="muted">Nenhum produto encontrado com esses filtros.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(p => {
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
      const share = node.querySelector('.btn-share');

      img.src = p.imagem || 'assets/img/placeholder.svg';
      img.alt = p.nome;
      imgA.href = p.link_afiliado || '#';
      title.textContent = p.nome;
      title.href = p.link_afiliado || '#';
      buy.href = p.link_afiliado || '#';
      buy.textContent = `Ver no ${srcLabel(p.fonte)} →`;
      price.textContent = fmtBR(p.preco);
      priceDate.textContent = p.preco_data ? `Preço consultado em ${p.preco_data}` : '';
      badge.textContent = srcLabel(p.fonte);
      badge.className = 'src-badge ' + srcClass(p.fonte);

      if(state.favs.has(p.id)) fav.classList.add('on');
      fav.addEventListener('click', () => toggleFav(p.id, fav));
      share.addEventListener('click', () => shareWhatsApp(p));

      frag.appendChild(node);
    });
    grid.appendChild(frag);
  }

  function toggleFav(id, el){
    if(state.favs.has(id)){ state.favs.delete(id); el.classList.remove('on'); }
    else { state.favs.add(id); el.classList.add('on'); }
    try{ localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs])); }catch(e){}
    if(state.onlyFavs) renderGrid();
  }

  function shareWhatsApp(p){
    const url = p.link_afiliado || location.href;
    const text = `Olha essa dica do Maquinando a Riqueza: ${p.nome}\n${url}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener');
  }

  function wireUI(){
    $('#q').addEventListener('input', e => { state.search = e.target.value; renderGrid(); });
    $('#priceMin').addEventListener('input', e => { const v = parseFloat(e.target.value); state.priceMin = isNaN(v) ? null : v; renderGrid(); });
    $('#priceMax').addEventListener('input', e => { const v = parseFloat(e.target.value); state.priceMax = isNaN(v) ? null : v; renderGrid(); });
    $$('.src-chk').forEach(c => c.addEventListener('change', () => {
      state.sources = new Set($$('.src-chk').filter(x=>x.checked).map(x=>x.value));
      renderGrid();
    }));
    $('#onlyFavs').addEventListener('change', e => { state.onlyFavs = e.target.checked; renderGrid(); });
    $('#clearFilters').addEventListener('click', () => {
      state.activeCat = 'todas'; state.priceMin = state.priceMax = null;
      state.sources = new Set(['mercadolivre','shopee','aliexpress','outros']);
      state.onlyFavs = false; state.search = '';
      $('#q').value=''; $('#priceMin').value=''; $('#priceMax').value='';
      $$('.src-chk').forEach(c=>c.checked=true);
      $('#onlyFavs').checked=false;
      syncCatUI(); renderGrid();
    });
    $('#openFilters').addEventListener('click', () => $('#filters').classList.add('open'));
    $('#closeFilters').addEventListener('click', () => $('#filters').classList.remove('open'));
    $('#menuToggle').addEventListener('click', () => {
      document.getElementById('catMenu').scrollIntoView({behavior:'smooth'});
    });

    const backTop = $('#backTop');
    window.addEventListener('scroll', () => {
      backTop.hidden = window.scrollY < 600;
    });
    backTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

    // deep link via hash: #categoria=slug
    const applyHash = () => {
      const m = /categoria=([^&]+)/.exec(location.hash);
      if(m){
        const slug = decodeURIComponent(m[1]);
        if(slug === 'ferramentas' || slug === 'maquinas' || state.categories.some(c=>c.slug===slug)){
          state.activeCat = slug; syncCatUI(); renderGrid();
        }
      }
    };
    window.addEventListener('hashchange', applyHash);
    applyHash();

    $('#yr').textContent = new Date().getFullYear();
  }

  (async function init(){
    await loadData();
    renderCatStrip();
    wireUI();
    renderGrid();
  })();
})();
