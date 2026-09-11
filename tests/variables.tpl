{$user_name}
{$user.id}
{$user['id']}
{$user["id"]}
{$foo.bar.baz}
{$foo[5].baz}
{$foo.5}
{$foo[$bar]}
{$foo->bar}
{$foo->bar.buz}
{$foo->getName()}
{$foo->bar(5)->buz(5.5)}
{$.get.debug}
{$.post.name}
{$.cookie.session}
{$.server.HTTP_HOST}
{$.const.PHP_EOL}
{$.tpl.name}
{$.version}
{$.php.some_function($a, $b)}
{$value@index}
{$value@first}
{$value@last}
{$value@key}
{$_modx->resource}
{$_modx->runSnippet('name')}
{* malformed: none of these are valid variable names in Fenom *}
{$ foo}
{$-foo}
{$5foo}
