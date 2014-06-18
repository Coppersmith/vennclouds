Vennclouds
==========

API design principles
=====================

  * Venncloud class:
    * The Venncloud class does not contain any hard-coded DOM ID's.
    * All controls should be optional.
    * The class should not directly update or even be aware of any of the controls (sliders, checkboxes) that are used to manipulate wordcloud parameters. The only DOM elements that the class directly updates are the \<div> containing the wordcloud and the \<span> tokens in the wordcloud.
  * Per-token filters can be added and removed from a Venncloud object, but are not object methods
  * Users can add sorting functions that sort on custom token fields
  * JavaScript guidelines
    * No global variables
    * "use strict";
    * Code should not generate any JSHint warnings (for an agreed upon set of warnings)


API in examples
===============

Create an instance:

```javascript
var venncloud = Object.create(Venncloud);
```

Initialize it with a container element and datasets (plus some options):

```javascript
venncloud.init({container: '#wordcloud_location', datasets: my_datasets});
```

Subscribe to some events:

```javascript
venncloud.on('token-removed', function() { do_something(); });
```


Tokens
======

Each token is a dictionary:

  * `idf` - **[required]**
  * `tf` - **[required]**
  * `text` - **[required]**
  * `span_classes` - array of strings with the DOM class names that should be attached to this token's \<span> in the wordcloud


Options
=======

  * `container` - CSS-selector or HTML-element where the waveform
    should be drawn. Required parameter. **[required]**
  * `datasets` - Array of token dictionaries. **[required]**
  * `base_fontsize` - 30 by default.
  * ...


Methods
=======

  * `init(params)` - initializes with the options listed above.
  * `on(eventName, callback)` - subscribes to an event.
  * `add_sort_type(sort_type_name, sort_function)` - add a callback function that compares two tokens
  * `set_sort_type(sort_type_name)` -
  * `add_token_filter(callback)` - adds a callback function that takes a token as an argument and returns a boolean
  * `remove_token_filter(callback)` - remove an existing token filter callback function
  * `update_base_fontsize(value)` -
  * `update_base_opacity(value)` -
  * `update_common_cloud(value)` -
  * `update_opacity_frequency(value)` -
  * `update_opacity_rarity(value)` -
  * `update_size_frequency(value)` -
  * `update_size_rarity(value)` -
  * ...

Events
======

You can listen to the following events:

  * `token-update` - when a token is updated. Callback function is passed a token as an argument.
  * `token-remove` - when a token is removed. Callback function is passed a token as an argument.
  * `click` - 
  * `optionclick` - 
  * ...
