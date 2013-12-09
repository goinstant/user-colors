## How to use Colors

You can assign colors to individual users (through a common user property)
within certain widgets. Currently, Form, User List, Click Indicator and Scroll
Indicator use User Colors.

### Table of Contents

1. [The `avatarColor` property](#the-avatarcolor-property)
1. [Setting the property](#setting-the-property)
 * [Using the User Colors library](#using-the-user-colors-library)
 * [Manually setting the property](#manually-setting-the-property)
 * [Making a claim in the JWT](#making-a-claim-in-the-jwt)
1. [Accessing the property](#accessing-the-property)
1. [Widgets using colors](#widgets-using-colors)

### The avatarColor property

All GoInstant widgets look for the user color in the user's `avatarColor`
property. Any valid color set in the user object via any of the methods
described below will be used to color various GoInstant widgets. Any user
that doesn't have an `avatarColor` set will receive the default gray `#aaaaaa`
coloring.

Here's an example of a user that will be colored bright green in GoInstant
widgets:

```json
{
   "id": "1234",
   "displayName": "tom",
   "avatarColor": "#00ff00"
}
```

The user above would appear in, for example, the [User List](../user_list.md)
with a bright green color swatch, and would have green indicators in the
[Scroll Indicator](../scroll_indicator.md) widget.

A valid color is any valid [hex triplet web color](http://en.wikipedia.org/wiki/Web_colors#Hex_triplet).
Note that named colors (e.g. "blue") are not supported. Setting an invalid color
in the `avatarColor` property will result in that value being ignored by
GoInstant; the user will appear as the default gray instead.

### Setting the property

#### Using the User Colors library

The preferred way to set a color is by selecting it from a set of colors using
the [User Colors library](../user_colors.md). Use of this library will
maintain a pool of available colors, ensure the user receives a unique color
from the pool, and release assigned colors back to the pool when the user leaves
the room. It even comes with a default set of twenty distinct colors to use.

Here's a typical example of how to use User Colors in an app:

```js
// Assuming connected to room 'myRoom'

// Get the UserColors constructor.
var UserColors = goinstant.widgets.UserColors;

// Choose a unique color from the default set.
var userColors = new UserColors({ room: myRoom });
userColors.choose(function(err, color) {
  console.log('I received the color ' + color);
});
```

See the [User Colors library](../user_colors.md) for details on using
the library.

#### Manually setting the property

If you already have a specific color in mind for a user, for example from another part
of your application, you can directly set the `avatarColor` property to immediately
update the user to that color.

```js
// Assuming you already have the user's key from room#user or room#users.
userKey.key('avatarColor').set('#f00', function(err) {
  if (err) { return console.error(err); }
  // The user now appears red in the user-list, etc.
});
```

Note that only hexadecimal colors are supported, and since you're not using the
User Colors library, there is no uniqueness check for the set color.

#### Making a claim in the JWT

If you always want an authenticated user to have the same color, it can be
specified up front by adding a private claim to their token that is used when
connecting to GoInstant. All private claims get turned into properties on the
user object, allowing you to set the `avatarColor` property by making a claim
in the token.

See the
[JWT](../../guides/users_and_authentication.md#what-is-a-jwt?)
page for details on generating JWTs. In a [node.js](http://www.nodejs.org)
application, adding a private claim might look like the following using
[JWT Simple](https://github.com/hokaccha/node-jwt-simple):

```js
var claims = {
  iss: 'myapp.com', // Issuer, required claim
  sub: 'userUniqueId', // Subject, required claim
  dn: 'userDisplayName', // Display Name, private claim
  avatarColor: '#ff0000' // Color for the widget UI, private claim
};

var token = jwtSimple.encode(claims, mySecretAppKey);

// Pass the token when connecting to GoInstant, and user will always appear
// with the color red.
```

### Accessing the property

You may want to access the `avatarColor` property of an existing user in order
to integrate the assigned color into your application. This can easily be done
using either of the `user` or `users` functions on the `room` object.

```js
// Once you've connected to a room
room.users = function(err, users, keys) {
  if (err) { return console.error(err); }

  for (var id in users) {
    var user = users[id];
    console.log('User ' + user.displayName + ' has color ' + user.avatarColor);
  }
};
```

Just remember that your application is responsible for assigning the `avatarColor`
property, and you may need to handle the non-existence case if the property has
not yet been set. GoInstant widgets handle this by using the default `#aaaaaaa`
color when there is no `avatarColor` available or it contains an invalid value.

### Widgets using colors

The following GoInstant widgets use the `avatarColor` property to color some
or all of their respective UIs.

* [Click Indicator](../click_indicator.md)
* [Form](../form.md)
* [Scroll Indicator](../scroll_indicator.md)
* [User List](../user_list.md)
