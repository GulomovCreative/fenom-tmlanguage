{'single quoted'}
{"double quoted"}
{'escaped \' quote'}
{'escaped \\ backslash'}
{"escaped \" quote"}
{"escape \n \r \t \\ \$ sequences"}
{'not an escape \n \r \t'}
{"Hi, $username!"}
{"Hi, {$user.name}!"}
{"Hi, {$user->getName()}!"}
{"Hi, {$user.name|up}!"}
{"Hi, {\$user->name}!"}
{'Hi, $foo'}
{'Hi, {$foo}'}
{'Hi, {$user.name|up}'}
{"hex \x41 and octal \101"}
{"{foo} is literal text, only {$foo} interpolates"}
<a href="/users/{$user_id}">{$user_name}</a>
{$foo|upper}
{$foo|lower}
{$looong|truncate:80:"..."}
{$looong|lower|truncate:$settings.count:$settings.etc}
{var $foo = "bar"|upper}
