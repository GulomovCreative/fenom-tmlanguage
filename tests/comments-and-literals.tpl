{* a single line comment *}
{*
  a multi line
  comment
*}
{* a comment with {$var} and {if $a} inside *}
{ not a tag, brace followed by space }
{}
{	tab after brace}
{ignore}
h1 {font-size: 24px; color: #F00;}
{/ignore}
<style>
h1 {color: #F00;}
</style>
<script>
var item = {cdn: "//example.com/"};
</script>
{var $arr = [1, 2, 3]}
{var $arr = ['y' => 'yellow', 'b' => 'blue']}
{var $arr = [1, [9, 8], 3]}
{set $arr[] = $value}
{set $arr.key = $value}
