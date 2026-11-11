# Maquinando a Riqueza — Site de Afiliados

Site estático (HTML + CSS + JS puros, sem frameworks) para indicação de máquinas e ferramentas com links de afiliado do Mercado Livre, Shopee e AliExpress.

## 1. Subir na HostGator

1. Entre no cPanel da HostGator.
2. Abra **Gerenciador de Arquivos** → pasta `public_html`.
3. Apague o `index.html` que vem de brinde.
4. Faça upload de **todos** os arquivos e pastas deste projeto para dentro de `public_html`.
   - A pasta `assets/` precisa ir inteira (CSS, JS, imagens).
   - O `products.json` precisa estar na raiz.
5. Abra seu domínio no navegador — pronto.

> Dica: se você fizer upload do .zip, use **"Extrair"** dentro do Gerenciador de Arquivos.

## 2. Trocar a imagem do banner

Substitua o arquivo `assets/img/banner.jpg` pela sua arte, mantendo o mesmo nome.

**Tamanhos ideais:**
- **Desktop:** 1600 × 600 px (ou 3200 × 1200 para telas Retina). Deixe os elementos importantes na metade direita, porque a esquerda fica coberta pelo texto do banner.
- **Mobile:** o banner oculta a imagem no celular por padrão (texto fica mais legível). Se quiser mostrar, edite a regra `@media (max-width: 960px) .hero-image { display: none }` em `assets/css/styles.css`.

Formato recomendado: **.jpg** (menor peso) ou .webp.

## 3. Adicionar / remover / editar produtos (products.json)

Todos os produtos ficam em um único arquivo: `products.json`.

```json
{
  "ultima_atualizacao": "10/11/2026",
  "categorias": [ ... lista das categorias ... ],
  "products": [
    {
      "id": "ml-123",
      "nome": "Parafusadeira Sem Fio 12V",
      "categoria": "ferramentas-eletricas",
      "preco": 199.90,
      "preco_data": "10/11/2026",
      "imagem": "https://http2.mlstatic.com/D_NQ_NP_xxx.webp",
      "link_afiliado": "https://mercadolivre.com/sec/abcdef",
      "fonte": "mercadolivre",
      "ranking": 1
    }
  ]
}
```

**Campos obrigatórios:**
- `id`: único (ex.: `ml-001`, `shp-002`, `ali-003`).
- `nome`: nome do produto.
- `categoria`: slug exato de uma categoria em `categorias`.
- `preco`: número em reais (use ponto, não vírgula).
- `preco_data`: data da consulta (`DD/MM/AAAA`).
- `imagem`: URL da foto oficial do anúncio.
- `link_afiliado`: URL do seu link de afiliado (não o link comum!).
- `fonte`: `mercadolivre`, `shopee`, `aliexpress` ou `outros`.

**Para remover:** apague o bloco `{ ... }` do produto.

**Para editar o preço:** mude `preco` e `preco_data`.

**Sempre atualize** `ultima_atualizacao` quando mexer no arquivo.

## 4. Adicionar Google Analytics

1. Abra `index.html`.
2. Descomente o bloco de `<script>` do Google Tag Manager/Analytics no `<head>` e troque `G-XXXXXXX` pelo seu ID.

## Observações

- Não existe carrinho, login nem pagamento. Tudo é link direto pro vendedor.
- Favoritos ficam no navegador do visitante (localStorage), não no servidor.
- Todos os links de produto usam `rel="sponsored nofollow noopener"` e abrem em nova aba.
