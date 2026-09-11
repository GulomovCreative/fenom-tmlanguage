{var $foo = "bar"}
{set $foo = 5}
{add $foo = 5}
{unset $foo}
{if $a}{elseif $b}{else}{/if}
{foreach $list as $value}{foreachelse}{/foreach}
{foreach $list as $key => $value index=$i first=$f last=$l}{/foreach}
{for $i = 0 to=10 step=2 index=$idx}{forelse}{/for}
{while $a < 10}{break}{continue}{/while}
{switch $a}{case 1}{case 2, 3}{default}{/switch}
{do $a++}
{include 'file.tpl'}
{include 'control.tpl' $options = $list name='select' isolate = true}
{insert 'file.tpl'}
{extends 'parent.tpl'}
{block 'header'}{parent}{/block}
{use 'blocks.tpl'}
{paste 'header'}
{filter|strip}{/filter}
{macro plus($x, $y, $z=0)}{/macro}
{import [plus, minus] from 'math.tpl' as math}
{macro.plus x=$num y=100}
{cycle ['odd', 'even']}
{raw $html}
{escape}{/escape}
{strip}{/strip}
{autoescape true}{/autoescape}
{ignore}{/ignore}
{if:ignore $cdn}{/if}
{foreach:ignore:strip $list as $v}{/foreach}
{block:escape 'name'}{/block}
{include:raw 'file.tpl'}
{var:ignoreEnd $a = 1}
{* s, a, e and i are documented as short codes but Tag has no optS/optA/optE/optI *}
{if:i $cdn}{/if}
{$a ? $b : $c}
{$looong|truncate:80}
