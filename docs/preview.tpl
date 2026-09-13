{* Product card *}
<article class="card">
  {if $product->inStock()}
    <h2 class="card__title">{$product.title|upper}</h2>
    <p class="card__price">{$product.price} {$.const.CURRENCY}</p>

    {foreach $product.tags as $tag}
      <span class="tag">{$tag}</span>
    {foreachelse}
      <span class="tag tag--empty">no tags yet</span>
    {/foreach}
  {else}
    <p>{$_modx->lexicon('shop_out_of_stock')}</p>
  {/if}
</article>
