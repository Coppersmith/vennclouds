/*TODO
  -- deal with default bootstrap.js handling of clicking on menus so we can click-edit values into the sliders
 */


//Data containers
var master_datasets = []; //All datasets encoded
var current_data = []; //Of size 1 for dynamic wordcloud, of size 3 for venncloud
var current_display_data = []; //array of size 1 for singecloud, size 3 for venncloud
var display_index_in_master_data = []; // array of size 1 for singlecloud, size 2 for venncloud [left_index, right_index]
var dataset_selection_list = [];
//jquery element that we will paint to -- parent pane
var main_wordcloud_container;

var selected_datasets = false;


//Convenience variable for better intuitive reading of the code to indicate what kind of viz we are making
var venncloud = false;
var singlecloud = false;

//Slider values and defaults go here, not all have been moved accross yet.
var overall_max_observed = 0;
var overall_min_idf_observed = 1;
var overall_max_word_length_observed=1;

//store the last computed settings and the settings we are about to compute as top level objects
var last_computed_settings = {};
var s = {
    center_threshold: 0.1,
    center_threshold_min: 0,
    center_threshold_max: 1,
    center_step: 0.003,
    min_req_tf: 10,
    max_req_tf: 40000,
    min_req_idf: 0.0001,
    max_req_idf: 0.2,
    min_req_chars: 1,
    max_req_chars: 100,
    size_rarity_weight: 0.8,
    opacity_rarity_weight: 0.5,
    size_frequency_weight: 0.5,
    opacity_frequency_weight: 0.5,
    base_fontsize: 30,
    base_opacity: 3,
    opacity_slider_max_value: 10,
    sort_type: 'ALPHABETIC',
    mean_counts: 1,
    mean_idf: 1,
    display_words: true,
    display_hashtags: true,
    display_user_mentions: true,
    onclick_function: function (token) {
        default_example_onclick(token);
    },
    oncontextclick_function: function (token) {
    }
};



/**************/
/** Controls **/
/**************/

//Control visibility
var common_cloud_controls_visible = false;
var frequency_filter_visible = false;
var rarity_filter_visible = false;
var sort_buttons_visible = false;
var wordcloud_entities_buttons_visible = false;
var opacity_controls_visible = false;
var size_controls_visible = false;
var wordcloud_description_visible = false;
var do_not_redraw_wordcloud = false;
var highlight_keywords = false;


/*******************/
/**Example Windows**/
/*******************/

if (document.getElementById('floatdivright')) {
    floatingMenu.add('floatdivright',
        {
            // Represents distance from left or right browser window
            // border depending upon property used. Only one should be
            // specified.
            // targetLeft: 0,
            targetRight: 10,

            // Represents distance from top or bottom browser window
            // border depending upon property used. Only one should be
            // specified.
            //targetTop: 10,
            targetBottom: 10,

            // Uncomment one of those if you need centering on
            // X- or Y- axis.
            // centerX: true,
            // centerY: true,

            // Remove this one if you don't want snap effect
            snap: true
        });
}

if (document.getElementById('floatdivleft')) {
    floatingMenu.add('floatdivleft',
        {
            targetLeft: 10,
            targetBottom: 10,
            snap: true
        });
}

function hide_example_windows() {
    $('#floatdivright').hide();
    $('#floatdivleft').hide();
}

function show_example_windows() {
    if (venncloud) {
        $('#floatdivright').show();
    }
    $('#floatdivleft').show();
}
function default_example_onclick(token) {
    if (token.length > 50) {
        //This happens if you click outside a word, ignore.
        return;
    }
    //The second window only has to be displayed if we are showing a Venncloud
    if (venncloud) {
        var r_tokens = master_datasets[display_index_in_master_data[1]].tokens;
        var r_str_exs = 'N/A';
        if (token in r_tokens) {
            r_str_exs = r_tokens[token]['examples'].join('<BR><HR>');
        }
        $('#examples_right').html(r_str_exs);
    }
    //Always display the left window
    var l_tokens = master_datasets[display_index_in_master_data[0]].tokens;
    var l_str_exs = 'N/A';
    if (token in l_tokens) {
        l_str_exs = l_tokens[token]['examples'].join('<BR><HR>');
    }
    $('#examples_left').html(l_str_exs);

    show_example_windows();
}

//Wrapper function, in case we have any other windows
function hide_all_windows() {
   hide_example_windows();
}

function initialize_wordcloud_controls() {
    //What should we do if the dictionary widget isn't active?
    //user_dictionaries = get_dictionaries();

    $("#radio").buttonset();
    $("#radio").click(function () {
        draw_wordcloud();
    });

    $("div#entities_buttons").click(function () {
        draw_wordcloud();
    });


    $("#required_observations_slider").slider({range: true});
    $("#required_idf_slider").slider({range: true});
    $("#required_characters_slider").slider({range: true});


    ///////////////////
    // USER CONTROLS //
    ///////////////////


    //Common cloud controls
    function common_cloud_change(event, ui) {
        var orig_value = $("#common_cloud_controls").slider("values", 0);
        //Dynamic range seems to want to be between 0 and 0.03
        //value = orig_value  / (100 / 0.01)
        value = orig_value;
        //value = orig_value * (100/55) / 5000 //Convert value to something more sensible for a threshold
        //DEBUG//document.getElementById('common_cloud_controls_out').innerHTML = value + " " + orig_value;
        s.center_threshold = value;
        draw_wordcloud();
    }

    $(function () {
        $("#common_cloud_controls").slider({
            "max": s.center_threshold_max,
            "min": s.center_threshold_min,
            "step": s.center_step,
            "value": s.center_threshold,
            slide: function (event, ui) {
                common_cloud_change(event, ui);
            },
            change: function (event, ui) {
                common_cloud_change(event, ui);
            }
        });
    });


    //begin rarity slider

    function size_rarity_update_change(event, ui) {
        s.size_rarity_weight = $('#size_rarity_slider').slider("values", 0);
        update_wordcloud();
    }
    $(function () {
        $("#size_rarity_slider").slider({
            "min": 0,
            "max": 1,
            "step": 0.01,
            "value": s.size_rarity_weight,
            slide: function (event, ui) {
                size_rarity_update_change(event, ui);
            },
            change: function (event, ui) {
                size_rarity_update_change(event, ui);
            }
        });
    });

    function opacity_rarity_change(event, ui) {
        //var orig_value = $( "#opacity_rarity_slider" ).slider( "values", num_words_max );
        var value = $("#opacity_rarity_slider").slider("values", 1);
        //DEBUG//document.getElementById('opacity_rarity_slider_out').innerHTML = value + " " + orig_value;
        s.opacity_rarity_weight = 1 - value;
        update_wordcloud();
    }
    $(function () {
        $("#opacity_rarity_slider").slider({
            "min": 0,
            "max": 1,
            "step": 0.01,
            "value": 1 - s.opacity_rarity_weight,
            slide: function (event, ui) {
                opacity_rarity_change(event, ui);
            },
            change: function (event, ui) {
                opacity_rarity_change(event, ui);
            }
        });
    });
//begin count sliders


    function size_frequency_change(event, ui) {
        //var orig_value = $( "#size_frequency_slider" ).slider( "values", num_words_max );
        //DEBUG//document.getElementById('size_frequency_slider_out').innerHTML = value + " " + orig_value;
        s.size_frequency_weight = $("#size_frequency_slider").slider("values", 1);
        update_wordcloud();
    }

    $(function () {
        $("#size_frequency_slider").slider({
            "min": 0,
            "max": 1,
            "step": 0.01,
            "value": s.size_frequency_weight,
            slide: function (event, ui) {
                size_frequency_change(event, ui);
            },
            change: function (event, ui) {
                size_frequency_change(event, ui);
            }
        });
    });

    function opacity_frequency_change(event, ui) {
        //var orig_value = $( "#opacity_frequency_slider" ).slider( "values", num_words_max );
        //DEBUG//document.getElementById('opacity_frequency_slider_out').innerHTML = value + " " + orig_value;
        s.opacity_frequency_weight = $("#opacity_frequency_slider").slider("values", 1);
        update_wordcloud();
    }
    /*
     $(function() {
     $( "#opacity_frequency_slider" ).slider();
     $( "#opacity_frequency_slider" ).slider("option","min",0);
     $( "#opacity_frequency_slider" ).slider("option","max",1);
     $( "#opacity_frequency_slider" ).slider("option","step",0.01);
     $( "#opacity_frequency_slider" ).slider("option","value",s.opacity_frequency_weight);

     $( "#opacity_frequency_slider" ).slider({
     slide: function( event, ui ) { opacity_frequency_change(event,ui);},
     change: function( event, ui ) { opacity_frequency_change(event,ui);}
     });

     });
     */

    $(function () {
        $("#opacity_frequency_slider").slider({
            "min": 0,
            "max": 1,
            "step": 0.01,
            "value": s.opacity_frequency_weight,
            slide: function (event, ui) {
                opacity_frequency_change(event, ui);
            },
            change: function (event, ui) {
                opacity_frequency_change(event, ui);
            }
        });
    });

    //end count slider

    function update_required_tf_filter_display(values) {
        //document.getElementById("required_observations_out").innerHTML = '[' + values[0] + ' , ' + values[1] + ']';

        // min value
        var min = $( "#min_required_observations" );
        if(min.attr('data-mode')==='input')
            min.find('input').val(values[ 0 ]);
        else
            min.text(values[ 0 ]);

        // max value
        var max = $( "#max_required_observations" );
        if(max.attr('data-mode')==='input')
            max.find('input').val(values[ 1 ]);
        else
            max.text(values[ 1 ]);
    }

    //begin Required Observations slider
    $(function () {
        /*$( "#required_observations_slider" ).slider("option","min",1);
         $( "#required_observations_slider" ).slider("option","max",overall_max_observed);
         $( "#required_observations_slider" ).slider("option","step",1);
         $( "#required_observations_slider" ).slider("option","values",[s.min_req_tf,s.max_req_tf]);
         */
        $("#required_observations_slider").slider({
            range: true,
            min: 1,
            max: overall_max_observed,
            step: 1,
            value: [s.min_req_tf, s.max_req_tf],
            change: function (event, ui) {
                //var orig_value = $( "#required_observations_slider" ).slider( "values", num_words_max );
                sli = $('#required_observations_slider');
                var orig_value = sli.slider("values") || [s.min_req_tf, s.max_req_tf];
                value = orig_value;

                //DEBUG//document.getElementById('required_observations_slider_out').innerHTML = value + " " + orig_value;
                s.min_req_tf = value[0];
                s.max_req_tf = value[1];
                update_required_tf_filter_display([s.min_req_tf, s.max_req_tf]);
                //required_observations = value;
                //document.getElementById("required_observations_out").innerHTML = required_observations;
                draw_wordcloud();

            },
            slide: function (event, ui) {
                var tmp = $("#required_observations_slider").slider("values");
                update_required_tf_filter_display(tmp);
            }
        });
        //update_required_tf_filter_display($("required_observations_slider").slider("values"));
        update_required_tf_filter_display([s.min_req_tf, s.max_req_tf]); // Maybe we want to display overall_max_observed instead?

        // attach click handlers to result display
        $( "#min_required_observations" ).on('click', function(event) { sliderValueInputHandler(event); });
        $( "#max_required_observations" ).on('click', function(event) { sliderValueInputHandler(event); });

    });


    function sliderValueInputHandler(event, conversionFunction){

        conversionFunction = conversionFunction || function(value) {return value;};

        var fieldValue;
        var targetElement = $(event.target);
        if(targetElement.attr('data-mode') === 'text') {
            // get field value
            fieldValue = targetElement.text();
            // change "mode" attribute
            targetElement.attr('data-mode', 'input');
            // remove all child nodes
            targetElement.empty();
            // append an input node
            targetElement.append('<input />');

            var newInput = targetElement.find('input');
            // set value into input
            newInput.val(fieldValue);
            // attach change handler
            newInput.on('change',function(event){
                var eSlider = $(targetElement.attr('data-for'));
                var type = targetElement.attr('data-range-element');
                var currentValues;
                switch (type) {
                    case 'min':
                    {
                        currentValues = eSlider.slider('values');
                        eSlider.slider('option', 'values', [ conversionFunction(newInput.val()), currentValues[1]]);
                        break;
                    }
                    case 'max':
                    {
                        currentValues = eSlider.slider('values');
                        eSlider.slider('option', 'values', [ currentValues[0], conversionFunction(newInput.val())]);
                        break;
                    }
                    default:
                    {
                        eSlider.slider('option', 'value', conversionFunction(newInput.val()));
                        break;
                    }

                }

            });
            newInput.on('blur', function(event){
                // revert back to text
                fieldValue = newInput.val();
                // change "mode" attribute
                targetElement.attr('data-mode', 'text');
                // remove handlers
                newInput.off();
                // remove all child nodes
                targetElement.empty();
                // set text
                targetElement.text(fieldValue);
            });
        }
    }

    //begin Required IDF slider
    function update_required_idf_filter_display(values) {
        //var disp = '[' + Math.floor(values[0]) + ' , ' + Math.floor(values[1]) + ']';
        //document.getElementById("required_idf_out").innerHTML = disp;

        // min value
        var min = $( "#min_required_idf" );
        if(min.attr('data-mode')==='input')
            min.find('input').val(Math.floor(values[0]));
        else
            min.text(Math.floor(values[0]));

        // max value
        var max = $( "#max_required_idf" );
        if(max.attr('data-mode')==='input')
            max.find('input').val(Math.floor(values[1]));
        else
            max.text(Math.floor(values[1]));
    }

    $(function () {

        /*
         $( "#required_idf_slider" ).slider();
         $( "#required_idf_slider" ).slider("option","min",1);
         $( "#required_idf_slider" ).slider("option","max",1/overall_min_idf_observed);
         $( "#required_idf_slider" ).slider("option","step",1);
         $( "#required_idf_slider" ).slider("option","value",(1/overall_min_idf_observed)/4);
         */
        $("#required_idf_slider").slider({
            min: 1,
            max: 1 / overall_min_idf_observed,
            step: 0.0001,
            values: [1 / s.max_req_idf, 1 / s.min_req_idf],
            change: function (event, ui) {
                //var orig_value = 1/$( "#required_idf_slider" ).slider( "values", num_words_max );
                var orig_value = $("#required_idf_slider").slider("values");
                value = orig_value;
                s.min_req_idf = 1 / orig_value[1];
                s.max_req_idf = 1 / orig_value[0];
                update_required_idf_filter_display([1 / s.max_req_idf, 1 / s.min_req_idf]);
                draw_wordcloud();
            },
            slide: function (event, ui) {
                var tmp = $("#required_idf_slider").slider("values");
                update_required_idf_filter_display(tmp);
            }
        });
        update_required_idf_filter_display([1 / s.max_req_idf, 1 / s.min_req_idf]);

        // attach click handlers to result display
        $( "#min_required_idf" ).on('click', function(event) { sliderValueInputHandler(event); });
        $( "#max_required_idf" ).on('click', function(event) { sliderValueInputHandler(event); });


    });

    function update_required_characters_filter_display(values) {

        // min value
        var min = $( "#min_required_characters" );
        if(min.attr('data-mode')==='input')
            min.find('input').val(values[ 0 ]);
        else
            min.text(values[ 0 ]);

        // max value
        var max = $( "#max_required_characters" );
        if(max.attr('data-mode')==='input')
            max.find('input').val(values[ 1 ]);
        else
            max.text(values[ 1 ]);
    }

    //begin Required Word Length
    $(function () {
        $("#required_characters_slider").slider({
            range: true,
            min: 1,
            max: overall_max_word_length_observed,
            step: 1,
            value: [s.min_req_chars, s.max_req_chars],
            change: function (event, ui) {
                sli = $('#required_characters_slider');
                var orig_value = sli.slider("values") || [s.min_req_chars, s.max_req_chars];
                value = orig_value;

                s.min_req_chars = value[0];
                s.max_req_chars = value[1];
                update_required_characters_filter_display([s.min_req_chars, s.max_req_chars]);
                draw_wordcloud();

            },
            slide: function (event, ui) {
                var tmp = $("#required_characters_slider").slider("values");
                update_required_characters_filter_display(tmp);
            }
        });
        update_required_characters_filter_display([s.min_req_chars, s.max_req_chars]); // Maybe we want to display overall_max_observed instead?

        // attach click handlers to result display
        $( "#min_required_characters" ).on('click', function(event) { sliderValueInputHandler(event); });
        $( "#max_required_characters" ).on('click', function(event) { sliderValueInputHandler(event); });


    });




    //end size slider

    //begin dynamic range

    function base_fontsize_change(event, ui) {
        //var orig_value = $( "#base_fontsize_slider" ).slider( "values", num_words_max );
        var orig_value = $("#base_fontsize_slider").slider("values", 12);
        value = orig_value;
        //DEBUG//document.getElementById('base_fontsize_slider_out').innerHTML = value + " " + orig_value;
        s.base_fontsize = value;
        update_wordcloud();
    }

    $(function () {
        handle = $('#base_fontside_slider');
        handle.slider();
        //$( "#base_fontsize_slider" ).slider();
        /*$( "#base_fontsize_slider" ).slider("option","min",5);
         $( "#base_fontsize_slider" ).slider("option","max",20);
         $( "#base_fontsize_slider" ).slider("option","step",1);
         $( "#base_fontsize_slider" ).slider("option","value",10);
         */

        handle.slider("option", "min", 1);
        handle.slider("option", "max", 100);
        handle.slider("option", "step", 1);
        handle.slider("option", "value", s.base_fontsize);

        /*
         $( "#base_fontsize_slider" ).slider("option","min",10);
         $( "#base_fontsize_slider" ).slider("option","max",1000);
         $( "#base_fontsize_slider" ).slider("option","step",3);
         $( "#base_fontsize_slider" ).slider("option","value",50);
         */
        $("#base_fontsize_slider").slider({
            slide: function (event, ui) {
                base_fontsize_change(event, ui);
            },
            change: function (event, ui) {
                base_fontsize_change(event, ui);
            }
        });

    });

    function base_opacity_change(event, ui) {
        var sli = $("#base_opacity_slider");
        //var orig_value = $( "#base_opacity_slider" ).slider( "values", num_words_max );
        var orig_value = sli.slider("values", 0.5);
        value = orig_value;
        //DEBUG//document.getElementById('base_opacity_slider_out').innerHTML = value + " " + orig_value;
        //base_opacity = opacity_slider_max_value - value;
        s.base_opacity = value;
        update_wordcloud();
    }
    $(function () {
        $("#base_opacity_slider").slider({
            "min": 0,
            "value": s.base_opacity,
            "max": s.opacity_slider_max_value,
            "step": 0.01,
            slide: function (event, ui) {
                base_opacity_change(event, ui);
            },
            change: function (event, ui) {
                base_opacity_change(event, ui);
            }
        });

    });

    //end dynamic range sliders

    //hide_all_controls();

} //End of initialize_wordcloud_controls
//What year is this that sum() is not defined by default!? --GAC
function sum(l) {
    return l.reduce(function (a, b) {
        return a + b;
    });
}
/*
 creates a clone. if passed a decorator function will apply it when cloning an object
 Note: for objects, clone does NOT follow prototype chain, however, it will clone objects set as properties
 */
function clone(original, decoratorFunction) {
    // start by assuming that original is a value, and can simply be copied via assignment
    var copy = original;

    // check to see if original is an object, since objects are assigned by reference
    if (typeof original === "object") {
        // check if array since both arrays and objects will be identified as "object" by 'typeof'
        if (toString.call(original) === "[object Array]") {
            copy = [];
            for (var i = 0, len = original.length; i < len; i += 1) {
                copy.push(clone(original[i]));
            }
        } else {
            // it is really an object
            copy = {};
            for (var prop in original) {
                if (original.hasOwnProperty(prop)) {
                    copy[prop] = clone(original[prop]);
                }
            }

            // if got a decorator function, apply it
            if (typeof decoratorFunction === "function") {
                copy = decoratorFunction(copy);
            }
        }
    }

    return copy;
}


//Passthrough for the moment, can adapt if the data is not in the expected form (e.g. arbreviz?)
proc_query_data = function (query) {
    return query;
};


function filter_for_idf(to_filter_dict) {
    // If 'required_idf_slider' does not exist, then s.min_req_idf and s.max_req_idf
    // will not be set properly by the callback functions attached to the slider.
    // Without this guard condition, all words are filtered out when 'required_idf_slider'
    // does not exist.
    if (document.getElementById('required_idf_slider')) {
        $.each(Object.keys(to_filter_dict), function (index, key) {
            this_idf = to_filter_dict[key]['idf'];
            if (this_idf < s.min_req_idf || this_idf > s.max_req_idf) {
                delete to_filter_dict[key];
            }
        });
    }
}


function filter_for_characters(to_filter_dict) {
    $.each(Object.keys(to_filter_dict), function (index, key) {
        this_word_length = key.length;
        if (this_word_length < s.min_req_chars || this_word_length > s.max_req_chars) {
            delete to_filter_dict[key];
        }
    });
}

//TODO: Make a function to take an arbitrary number of dicts to filter, and filter on the sum of their tfs

function filter_for_required_tf(to_filter_dicts) {
    //If we are passed {} or [{}] but not [{},{},...], this is simple and fast
    if (to_filter_dicts.constructor != Array || to_filter_dicts.length == 1) {
        if (to_filter_dicts.constructor == Array) {
            to_filter_dict = to_filter_dicts[0]; // Passed [{}]
        }
        else {
            to_filter_dict = to_filter_dicts; // passed {}
        }
        $.each(Object.keys(to_filter_dict), function (index, key) {
            this_tf = to_filter_dict[key]['tf'];
            //if (this_tf < s.min_req_tf || this_tf > s.max_req_tf )  {
            if (key != 'orioles' && (this_tf < s.min_req_tf || this_tf > s.max_req_tf )) {///HARDCODE WHY!?
                delete to_filter_dict[key];
            }
        });
        return;
    }

    //If we're passed [{},{},...] sum the occurences of each token across all objects before applying filter
    var all_tokens = {}; //Keyed on token, value is summed tf
    for (var index = 0, len = to_filter_dicts.length; index < len; index++) {
        to_filter_dict = to_filter_dicts[index];
        $.each(Object.keys(to_filter_dict), function (index, key) {
            this_tf = to_filter_dict[key]['tf'];
            if (key in all_tokens) {
                all_tokens[key] += this_tf;
            }
            else {
                all_tokens[key] = this_tf;
            }
        });
    }
    //Now go through and filter out any tokens for which we don't have enough occurences
    $.each(Object.keys(all_tokens), function (index, key) {
        combined_tf = all_tokens[key];
        if (combined_tf < s.min_req_tf || combined_tf > s.max_req_tf) {
            for (var index = 0, len = to_filter_dicts.length; index < len; index++) {
                to_filter_dict = to_filter_dicts[index];
                //if (key in to_filter_dict){
                if (key in to_filter_dict && key != 'orioles') {
                    delete to_filter_dict[key];
                }
            }
        }
    });
}

function filter_for_required_observations_and_idf(to_filter_dict) {
    //TODO: classifier score
    filter_for_idf(to_filter_dict);
    $.each(Object.keys(to_filter_dict), function (index, key) {
        this_tf = to_filter_dict[key]['tf'];
        if (this_tf < s.min_req_tf || this_tf > s.max_req_tf) {
            delete to_filter_dict[key];
        }
    });
}

//This function might not actually be needed, given how we constructed compute master data
function filter_multiple_for_required_tf_and_idf(to_filter_dicts) {
    //Filter each list individually for idf
    for (var index = 0, len = to_filter_dicts.length; index < len; index++) {
        filter_for_idf(to_filter_dicts[index]);
    }

    //Filter them jointly for tf
    filter_for_required_tf(to_filter_dicts);
}

//TODO: Add displays necessary to make this function
function filter_for_display_entities_types(to_filter) {
    if (document.getElementById('display_plain_words')) {
        s.display_words = $('#display_plain_words').is(':checked');
    }
    else {
        // Wordcloud should be displayed even if DOM is missing 'display_plain_words' checkbox
        s.display_words = true;
    }
    s.display_hashtags = $('#display_hashtags').is(':checked');
    s.display_user_mentions = $('#display_user_mentions').is(':checked');

    if (s.display_words && s.display_user_mentions && s.display_hashtags) {
        return to_filter; //All types selected, this is just a passthrough
    }

    //filtered = [];
    //console.log(to_filter);
    $.each(Object.keys(to_filter), function (index, i) {
        key = to_filter[i]['text'];
        if (key[0] == '@') {
            if (!s.display_user_mentions) {
                delete to_filter[i];
            }
        }
        else if (key[0] == '#') {
            if (!s.display_hashtags) {
                delete to_filter[i];
            }
        }
        else {
            if (!s.display_words) {
                delete to_filter[i];
            }
        }
    });
    //return filtered;
    return to_filter;
}


//Sorting
function sorter(to_sort, my_sort_type) {
    to_sort.sort(function (a, b) {
        return b['text'] < a['text'];
    }); // The default is alphabetic
    my_sort_type === 'IDF' ? to_sort.sort(function (a, b) {
        return b['idf'] - a['idf'];
    }) : null; // Reverse, so rarer words are on top
    my_sort_type === 'COUNT' ? to_sort.sort(function (a, b) {
        return b['tf'] - a['tf'];
    }) : null;
    return to_sort;
}

function preference_sorter(to_sort) {
    //Sort by what the user has specified
    s.sort_type = $("#radio :radio:checked").attr('id');
    sorted = sorter(to_sort, s.sort_type);
    return sorted;
}


//Size and Opacity calculations
get_size = function (count, idf) {
    weighted_by_count = count * (10 / overall_max_observed); //HARDCODE??
    weighted_by_rarity_size = 1 / Math.log(1 / idf);
    weighted_size = s.base_fontsize; // A base size
    //console.log(weighted_size, weighted_by_rarity_size, weighted_by_count, count, idf);
    weighted_size *= (1 - s.size_frequency_weight) + s.size_frequency_weight * weighted_by_count;
    weighted_size *= (1 - s.size_rarity_weight) + (s.size_rarity_weight * weighted_by_rarity_size);
    //DEBUG.innerHTML = "~!" + (1-rarity_weight) * unweighted_by_rarity_size + "~~" + rarity_weight * idf + "!@!" + max_observed_count;
    if (weighted_size < 10) {
        return 10;
    }

    if (weighted_size > 60) {
        return 60;
    }

    return(weighted_size);
};


get_opacity = function (count, idf) {
    weighted_opacity = s.base_opacity;
    weighted_by_count = count / (mean_counts * 2);
    weighted_by_rarity = 1 / Math.log(1 / idf);
    weighted_opacity *= (1 - s.opacity_frequency_weight) + (s.opacity_frequency_weight * weighted_by_count);
    weighted_opacity *= (s.opacity_rarity_weight) + ((1 - s.opacity_rarity_weight) * weighted_by_rarity);
    if (weighted_opacity < 0.1) {
        weighted_opacity = 0.1;
    }

    if (weighted_opacity > 1) {
        weighted_opacity = 1;
    }

    return(weighted_opacity);
};


//NB: Each word knows where it is located, so we don't explicitly target the WC location
function update_wordcloud() {
    //Updates all the WC visual aspects that have changed since last time.
    for (var cloud_index = 0, numclouds = current_display_data.length; cloud_index < numclouds; cloud_index++) {
        $.each(Object.keys(current_display_data[cloud_index]), function (index) {
            token = current_display_data[cloud_index][index];
            var token_element = token['handle'];
            token_element.style.fontSize = get_size(token['tf'], token['idf']) + 'pt';
            token_element.style.opacity = get_opacity(token['tf'], token['idf']);
        });
    }

    add_description_to_display();
}


function prepare_wordcloud_data(selected_datasets) {
    //selected datasets is an array of length 1 or 2 indicating the index of the dataset(s) to be used

    //TODO:Move to where we switch modes
    //Determine whether we are working on one or two corpora
    singlecloud = false;
    venncloud = false;
    if (selected_datasets.length == 1) {
        singlecloud = true;
    }
    else if (selected_datasets.length == 2) {
        venncloud = true;
    }
    else {
        alert('Oh shucks, something broke.');
    }


    //Store the dataset(s) selected in current_data
    current_data = []; //Of size 1 for dynamic wordcloud, of size 3 for venncloud
    for (var j = 0, lenj = selected_datasets.length; j < lenj; j++) {
        var dat = clone(master_datasets[selected_datasets[j]]['tokens']);

        //Filter for idf,tf,entity types
        dat = filter_for_display_entities_types(dat);
        filter_for_idf(dat);

        filter_for_characters(dat);

        current_data.push(dat);
    }

    filter_for_required_tf(current_data);

    //Split into lists (if applicable) and convert to arrays
    if (singlecloud) {
        current_display_data = [];
        for (var k in current_data[0]) {
            current_display_data.push(current_data[0][k]);
        }
        current_display_data = [current_display_data];
    }
    else if (venncloud) {
        var common_list = [];
        var left_list = [];
        var right_list = [];
        current_display_data = [left_list, common_list, right_list];
        var L = current_data[0];
        var R = current_data[1];

        var all_tokens = {};
        for (var k1 in L) {
            all_tokens[k1] = true;
        }
        for (var k2 in R) {
            all_tokens[k2] = true;
        }

        for (var token in all_tokens) {
            //TODO: classifier scores

            var l_prop = L[token] && L[token]['prop_tokens'] || 0;
            var l_tf = L[token] && L[token]['tf'] || 0;
            var r_prop = R[token] && R[token]['prop_tokens'] || 0;
            var r_tf = R[token] && R[token]['tf'] || 0;

            if (r_tf > 0 && l_tf > 0 &&
                Math.abs((l_prop - r_prop) / (l_prop + r_prop)) <= s.center_threshold) {
                common_token = {};
                common_token['text'] = token;
                common_token['tf'] = (l_tf + r_tf); // Shoudl we average instead of add?
                common_token['idf'] = L[token]['idf'];
                //Add classifier scores?
                common_list.push(common_token);
            }
            else {
                r_prop < l_prop ? left_list.push(L[token]) :
                    right_list.push(R[token]);
            }

        }
    }

    //Sort
    $.map(current_display_data, preference_sorter);

    /*

     //Do set-level changes -- i.e. those that result in a complete redraw of the wc
     //Figure out what we are displayign and in what order
     current_display_data = [];
     for (var i=0, len=current_data.length; i<len; i++){
     var tmp =filter_for_required_observations_and_idf(current_data[i]);
     tmp = filter_for_display_entities_types(tmp);
     tmp = sorter(tmp, 'COUNT'); //HARDCODE -- number of words is not getting set correctly
     current_display_data.push(tmp);
     };
     */

}


function tf_size_weight_str() {
    return "TF:" + Math.round(s.size_frequency_weight * 100) / 100;
}
function idf_size_weight_str() {
    return "IDF:" + Math.round(s.size_rarity_weight * 100) / 100;
}
function tf_opacity_weight_str() {
    return "TF:" + Math.round(s.opacity_frequency_weight * 100) / 100;
}
function idf_opacity_weight_str() {
    return "IDF:" + Math.round(s.opacity_rarity_weight * 100) / 100;
}

function add_description_to_display() {
    var d = "";
    d += "Words displayed occur at least " + s.min_req_tf + " and at most " + s.max_req_tf + " times in the query.<BR>";
    d += "Words displayed occur in fewer than " + Math.floor(1 / s.min_req_idf) + " and more than " + Math.floor(1 / s.max_req_idf) + " documents in the whole corpus.<BR>";

    if (s.size_frequency_weight > 0) {
        if (s.size_rarity_weight > 0) {
            d += "Larger words frequently occur in the query and rarely occur in the corpus (TF*IDF). ";
            d += "[" + tf_size_weight_str() + "," + idf_size_weight_str() + "]";
            d += "<BR>";
        }
        else {
            d += "Larger words are more frquent in the query (TF). [" + tf_size_weight_str() + "]<BR>";
        }
    }
    else {
        if (s.size_rarity_weight > 0) {
            d += "Larger words are rarer in the whole corpus (IDF). [" + idf_size_weight_str() + "<BR>";
        }
    }

    if (s.opacity_frequency_weight > 0) {
        if (s.opacity_rarity_weight < 1) {
            d += "Darker words frequently occur in the query and rarely occur in the corpus (TF*IDF). ";
            d += "[" + tf_opacity_weight_str() + "," + idf_opacity_weight_str() + "]";
            d += "<BR>";
        }
        else {
            d += "Darker words are more frequent in the query (TF). [" + tf_opacity_weight_str() + "]<BR>";
        }
    }
    else {
        if (s.opacity_rarity_weight < 1) {
            d += "Darker words are rarer in the whole corpus (IDF). [" + idf_opacity_weight_str() + "]<BR>";
        }
    }

    if (s.sort_type == "ALPHABETIC") {
        d += "Words are sorted alphabetically.<BR>";
    }
    if (s.sort_type == "IDF") {
        d += "Words are sorted by those that occur in the fewest document to those that occur in the most, in the whole corpus (IDF).<BR>";
    }
    if (s.sort_type == "COUNT") {
        d += "Words are sorted by many to few occurences in the query (TF).<BR>";
    }

    $('#wordcloud_description_output').html(d);
}


function paint_tokens(display, data, color) {
    $.each(data, function (index, t) {
        var element_id = 'token_' + index;
        var token_element = document.createElement('span');
        var attr = document.createAttribute('id');
        attr.nodeValue = element_id;
        token_element.setAttributeNode(attr);

        token_element.textContent = ' ' + t['text'] + ' ';

        token_element.style.fontSize = '2pt';
        token_element.style.color = color;

        if (t.span_classes) {
          for (var i in t.span_classes) {
            token_element.classList.add(t.span_classes[i]);
          }
        }

        t['handle'] = token_element;

        //Actually add to the display
        display.append(token_element);
    });
}


function draw_wordcloud() {

    display_index_in_master_data = selected_datasets;


    prepare_wordcloud_data(selected_datasets);


    //Actually put the words on the screen -- before they have been properly sized/opacitized

    //clear the existing display(s) and set it to not display
    //main_wordcloud_container.hide();

    // before removing elements, unbind handlers
    $('#left_dataset_selector').off();
    $('#right_dataset_selector').off();

    main_wordcloud_container = $('div#'+s.wordcloud_element);
    main_wordcloud_container.children().remove();

    var leftAvailableDatasets = '';
    var rightAvailableDatasets = '';
    var tempDatasetIndex;
    for (tempDatasetIndex in master_datasets){
        leftAvailableDatasets += '<option value="'+tempDatasetIndex+'" '+((selected_datasets[0] == tempDatasetIndex)?'selected':'')+' >'+master_datasets[tempDatasetIndex].name+'</option>';
        rightAvailableDatasets += '<option value="'+tempDatasetIndex+'" '+((selected_datasets[1] == tempDatasetIndex)?'selected':'')+'>'+master_datasets[tempDatasetIndex].name+'</option>';
    }

    var display = "<table width='100%'>";
    display += "<thead><tr>";
    display += "<th>Left Dataset:<select id='left_dataset_selector'>"+leftAvailableDatasets+"</select></th>";
    display += "<th></th>";
    display += "<th>Right Dataset:<select id='right_dataset_selector'>"+rightAvailableDatasets+"</select></th>";
    display += "</tr></thead>";
    display += "<tbody class='js-context-area'><tr>";
    if (venncloud) {
	//TODO: Deal with space more effectively -- we should be able to estimate how much room each should get
         display += "<td style='vertical-align:top'><span class='wordcloud-display' id='leftcloud'></span></td>";
         display += "<td style='vertical-align:top'><span class='wordcloud-display' id='commoncloud'></span></td>";
         display += "<td style='vertical-align:top'><span class='wordcloud-display' id='rightcloud'></span></td>";
        /*display += "<td style='vertical-align:top' width='33%'><span class='wordcloud-display' id='leftcloud'></span></td>";
        display += "<td style='vertical-align:top' width='34%'><span class='wordcloud-display' id='commoncloud'></span></td>";
        display += "<td style='vertical-align:top' width='33%'><span class='wordcloud-display' id='rightcloud'></span></td>";
	*/
    }
    else if (singlecloud) {
        display += "<td><span class='wordcloud-display' id='commoncloud'></span></td>";
    }
    display += "</tr></tbody></table>";
    main_wordcloud_container.html(display);

    // attach change handlers
    $('#left_dataset_selector').on('change', dataset_selected);
    $('#right_dataset_selector').on('change', dataset_selected);

    //paint the tokens with defaults
    if (singlecloud) {
        display = $('span#commoncloud');
        paint_tokens(display, current_display_data[0], 'black');
    }
    else if (venncloud) {
        paint_tokens($('span#leftcloud'), current_display_data[0], 'blue');
        paint_tokens($('span#commoncloud'), current_display_data[1], 'black');
        paint_tokens($('span#rightcloud'), current_display_data[2], 'red');
    }

    // Call update to get actual values correct
    update_wordcloud();

    //Add handlers stored in `s` to the wordcloud display
    var wordcloud_element = s.wordcloud_element || 'wordcloud_location';
    main_wordcloud_container = $('#' + wordcloud_element);
    var context_area = $('#' + wordcloud_element + '>table>tbody');
    add_handlers(context_area);

    // Turn the display on
    main_wordcloud_container.show();


}
var counts = [];
function compute_master_data(datasets) {
    var idfs = [];


    //Add fields to each dataset
    for (var j = 0, lenj = datasets.length; j < lenj; j += 1) {
        var dataset = datasets[j];
        var tokens = dataset['tokens'];
        var num_tokens = dataset['num_tokens'];
        var num_documents = dataset['num_documents'];
        var tok_rep = {}; //indexed version of the 'tokens' field
        for (var i = 0, len = tokens.length; i < len; i += 1) {
            var tf = tokens[i]['tf'];
            var idf = tokens[i]['idf'];
            counts.push(tf);
            idfs.push(idf);
            token = tokens[i]['text'];
            tokens[i].opacity = 1;
            tokens[i].size = 9;
            tokens[i].handle = undefined; //This will be the jquery visual element handle for easy updates
            tokens[i].prop_docs = tf / num_documents;
            tokens[i].prop_tokens = tf / num_tokens;
            tok_rep[token] = tokens[i];

            //update max and mins observed if needed
            (tf > overall_max_observed) ? overall_max_observed = tf : null; //This is slightly different from the last iteration
            (idf < overall_min_idf_observed) ? overall_min_idf_observed = idf : null;
            (token.length > overall_max_word_length_observed) ? overall_max_word_length_observed = token.length: null;

        }
        //Convert all master data arrays to dictionaries keyed on tokens
        datasets[j]['tokens'] = tok_rep;

    }
    //Put anything here we can precompute on load for all datasets, independent of view.

    mean_counts = sum(counts) / counts.length;
    mean_idf = sum(idfs) / idfs.length;
    counts.sort();
    //Something here can figure out how many words we want to display overall
    //s.min_req_tf = counts[Math.floor(counts.length/2)] * 2;
    if (counts.length > 500) {
        s.min_req_tf = counts[Math.floor(counts.length) - 500];
    }
    else {
        s.min_req_tf = counts[Math.floor(counts.length / 2)];
    }
    //Update the sliders that have dynamic settings
    if (s.max_req_tf > overall_max_observed) {
        s.max_req_tf = overall_max_observed;
    }
    if (s.max_req_chars > overall_max_word_length_observed) {
        s.max_req_chars = overall_max_word_length_observed;
    }

    $("#required_observations_slider").slider("option", "max", overall_max_observed);
    $("#required_idf_slider").slider("option", "max", 1 / overall_min_idf_observed);
    $("#required_characters_slider").slider("option", "max", overall_max_word_length_observed);

    //////var tmp = $( "#required_idf_slider" ).slider("values",(1/overall_min_idf_observed)/4);
    //////$( "#required_idf_slider" ).slider("option","value",tmp || (1/overall_min_idf_observed)/4);
    tmp = [1 / s.max_req_idf, 1 / s.min_req_idf];
    $("#required_idf_slider").slider("option", "values", tmp);

    //tmp = $( "#required_observations_slider" ).slider("values") || [s.min_req_tf,s.max_req_tf];
    tmp = [s.min_req_tf, s.max_req_tf];
    $("#required_observations_slider").slider("option", "values", tmp);

    tmp = [s.min_req_chars, s.max_req_chars];
    $("#required_characters_slider").slider("option", "values", tmp);


    return datasets;
}
function add_handlers(zone) {
    //console.log("Z:",zone);
    zone.on("click", function (e) {
        e = e || Event;
        s.onclick_function(e.target.innerHTML.trim());
    });
    zone.on("contextmenu", function (e) {
        e = e || Event;
        s.oncontextclick_function(e.target);
        return false;
    });
}
function initialize_wordcloud() {
    required_idf = overall_min_idf_observed;
    required_observations = 4;
    compute_master_data(); //Actually compute it here.
}

function dataset_selected() {
    var leftDatasetId = $('#left_dataset_selector')[0].value;
    var rightDatasetId = $('#right_dataset_selector')[0].value;
	selected_datasets = [leftDatasetId, rightDatasetId];
	draw_wordcloud();
}

function defaulLeftClickHandler(token){
    default_example_onclick(token);
}
function defaulRightClickHandler(token){

}

function make_me_a_venncloud(datasets, options) {
    //Datasets is always an array of token dictionaries

    var min_observations_required = options.min_observations_required || 2;
    //var onclick_function=function(token){} || options.click;
    s.onclick_function = options.click || defaulLeftClickHandler;
    s.oncontextclick_function = options.contextclick || defaulRightClickHandler;

    var wordcloud_element = options.wordcloud_element || 'wordcloud_location';

    s.wordcloud_element = wordcloud_element;

    initialize_wordcloud_controls();

    master_datasets = compute_master_data(datasets);

    var initialSelection = [];
    if (master_datasets.length > 0) initialSelection.push(0);
    if (master_datasets.length > 1) initialSelection.push(1);
	selected_datasets = initialSelection;
    draw_wordcloud();

    hide_example_windows();

    main_wordcloud_container = $('#' + wordcloud_element);
    var context_area = $('#' + wordcloud_element + '>table>tbody');

}
