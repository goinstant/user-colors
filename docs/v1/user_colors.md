# User Colors

[Github Link](html/user_colors_github.html "include")

The User Colors library allows you to assign a unique color to each users in a
[Room](../javascript_api/rooms/index.md), ensuring that there are no conflicts
with the colors assigned to other users in the Room.

By default, the library will choose from a default set of 20 colors supplied by
GoInstant, but you can supply your own set of custom colors if desired.

[User Colors](html/user_colors_demo_iframe.html "include")

## Table of Contents

1. [Code Example](#code-example)
1. [Constructor](#constructor)
1. [UserColors#choose](#usercolors#choose)

## Code Example

### 1. Include our CDN assets:

#### Note on Versioning

Specific version of widgets can be found on our [CDN](https://cdn.goinstant.net/).

```html
<script type="text/javascript" src="https://cdn.goinstant.net/v1/platform.min.js"></script>
<script type="text/javascript" src="https://cdn.goinstant.net/widgets/user-colors/latest/user-colors.min.js"></script>
```

```js
// Connect URL
var url = 'https://goinstant.net/YOURACCOUNT/YOURAPP';

// Connect to GoInstant
goinstant.connect(url, function (err, platformObj, roomObj) {
  if (err) {
    throw err;
  }

  // Create a new instance of the UserColors widget
  var userColors = new goinstant.widgets.UserColors({ room: roomObj });

  // Choose a color for the current user. If the user already has a color
  // assigned from a prior use of 'choose' then that existing color will be
  // returned.
  userColors.choose(function(err, color) {
    if (err) {
      throw err;
    }
    console.log('The chosen color is ' + color);
  });
});
```

## Constructor

Creates the UserColors instance with customizable options.

### Methods

- ###### **new UserColors(options)**

### Parameters

| options |
|:---|
| Type: [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) |
| An object with the following options: |
| - `room` is a [GoInstant Room](https://developers.goinstant.net/v1/rooms/index.html) that you have previously joined |
| - `colors` is an optional array containing a set of colors each in form of a hexadecimal color-code string (e.g. "#aaa"). Color names (e.g. "blue") are not supported. These will be used to override the default colors. |

### Example

```js
var mainRoom = platform.room('mainRoom');

mainRoom.join(function(err) {
  // Note that your set of custom colors should be at least as large as the
  // maximum room size of your application, or some users may receive the
  // default '#aaa' color.
  var customColors = [
    '#ff0000',
    '#222222',
    '#00FF00',
    '#00FFFF'
  ];

  var options = {
    room: mainRoom,
    colors: customColors
  };

  var userColors = new UserColors(options);
});
```

## UserColors#choose

### Methods

- ###### **userColors.choose(callback(errorObject, color))**

### Parameters

| callback(errorObject, color) |
|:---|
| Called once a color has been [assigned to the local user](./guides/colors.md). |
| - `errorObject` will be `null` unless an error has occured. |
| - `color` is a hexidecimal representation of the colors (e.g. "#FF003B") associated with the local user. |

### Example

```js
// Return or generate a color for the current user
userColors.choose(function(err, color) {

  // Returned color is #FF0C3B

});
```
