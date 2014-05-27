var cloud_datasets = {};


function get_cloud_data(corpus, utterance_list){

    var utterance_ids = utterance_list.utterance_ids;
    var dataset_name = utterance_list.dataset_name;

    return $.Deferred( function( defer ) {


    send = {};
    send.dataset = corpus;
    send.utterances = utterance_ids;


    $.ajaxSetup({
        contentType: "application/json; charset=utf-8",
        dataType: "json"
    });

    $.ajax({
        url: "/cloud_data_from_utterances",
        type: "POST",
        data: JSON.stringify(send),
        error: function(xhr, error) {
            alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
            defer.reject('Deferred error message');
        },
        success: function(data) {
            //cloud_datasets = [data];
            wc_data = {};
            wc_data.dataset_name = dataset_name;
            wc_data.tokens = data;
            wc_data.num_tokens = data.length;
            wc_data.num_documents = utterance_ids.length;
            cloud_datasets[dataset_name] = wc_data;
            //$('#cloud_data_landing_zone').html(prettyPrint(data));
            defer.resolve(data);
        }
    });
    }).promise();
}


function get_pseudoterm(pt_id, corpus_name){

    send = {};
    send.dataset=corpus_name;
    send.count = 1;
    send._id=(pt_id);

    $.ajaxSetup({
        contentType: "application/json; charset=utf-8",
        dataType: "json"
    });

    $.ajax({
        url: "/find_pseudoterms",
        type: "POST",
        data: JSON.stringify(send),
        error: function(xhr, error) {
            alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
        },
        success: function(data) {
            active_pseudoterm = data[0]; //Global var
            $('#pt_eng_display')
                .val(active_pseudoterm.eng_display);

            $('#pt_native_display')
                .val(active_pseudoterm.native_display);
            $('#pt_stats_landing_zone')
                .html(prettyPrint(active_pseudoterm));
            $('#pt_snippets_play_button')
                .click(function(){playPseudoterm('pt_player', pt_id);});
            $('#pt_snippets_play_button')
                .click(function(){playPseudoterm_with_context('pt_player', pt_id);});

            //Also get audioevents and snippets
        }
    });
}


function annotate_pt_eng_label(corpus){
    active_pt_id = active_pseudoterm._id;
    annotation = $('#pt_eng_display').val();
    if (active_pseudoterm.eng_display == annotation){
        return;
    }
    else {
        send = {};
        send.dataset=corpus;
        send._id=active_pt_id;
        send.eng_display = annotation;
        send.annotated = true;
        $.ajax({
            url: "/update_pseudoterm",
            type: "POST",
            data: JSON.stringify(send),
            error: function(xhr, error) {
                alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
            },
            success: function(data) {
                get_pseudoterm(active_pt_id, corpus);
            }
        });
        //TODO: Issue a call to redraw that token of the wordcloud.
        //alert('updating'+send.eng_display);
        update_displayed_token( active_pseudoterm.eng_display , annotation);
    }
}


function annotate_pt_native_label(corpus){
    active_pt_id = active_pseudoterm._id;
    annotation = $('#pt_native_display').val();
    send = {};
    send.dataset=corpus;
    send._id=active_pt_id;
    send.native_display = annotation;
    $.ajax({
        url: "/update_pseudoterm",
        type: "POST",
        data: JSON.stringify(send),
        error: function(xhr, error) {
            alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
        },
        success: function(data) {
            //Reload the PT now to see the changes reflected
            get_pseudoterm(active_pt_id, corpus);
        }
    });
}


function junk_this_pseudoterm(event) {
    active_pt_id = active_pseudoterm._id;
    send = {};
    send.dataset = event.data.corpus;
    send._id=active_pt_id;
    send.native_display = annotation;
    $.ajax({
        url: "/junk_pseudoterm",
        type: "POST",
        data: JSON.stringify(send),
        error: function(xhr, error) {
            alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
        },
        success: function(data) {
            //Reload the PT now to see the changes reflected
            //get_pseudoterm( active_pt_id );
        }
    });

    junk_displayed_token( active_pseudoterm.eng_display );
}


/*
  set_up_annotate_pseudoterm_id() is a callback handler that is
  invoked when a user clicks on a word in a wordcloud.

  The callback function is assigned from make_me_a_venncloud() in
  Glen's dynamic_wordclouds.js.  The make_me_a_venncloud() function
  does not allow any parameters but 'token' to be passed to callback
  functions for words in the wordcloud - but we need to pass a 'corpus'
  parameter to set_up_annotate_pseudoterm_id().

  We use a constructor function to create a closure that allows
  set_up_annotate_pseudoterm_id() to access the 'corpus' parameter,
  without storing the 'corpus' parameter in a global variable.
*/
var CorpusClosureForSetupAnnotatePseudotermID = function(corpus, waveform_visualizer) {
  this.corpus = corpus;
  this.waveform_visualizer = waveform_visualizer;

  this.set_up_annotate_pseudoterm_id = function(token) {
      if (token.length > 50){ return; } //If you mistakenly click the whole box
      $.get('/www/pseudoterm_template.html',function(data){
          alert("in");
          $('#annotation_landing_zone').html(data);
          alert("Past");
      });

      var token_container = master_datasets[selected_datasets[0]].tokens[token] ||
          master_datasets[selected_datasets[1]].tokens[token] ||
          [];
      var pt_ids = token_container.pt_ids;
      console.log(pt_ids);
      pseudotermID = pt_ids[0]['$oid'];
      get_pseudoterm(pseudotermID, corpus); //Also posts to the global variable

      if (waveform_visualizer) {
        waveform_visualizer.loadAndPlayURL(getURLforPseudotermWAV(corpus, pseudotermID));
      }

      $("#pt_eng_display")
          .focusout(function(){
              annotate_pt_eng_label(corpus);
          });

      $("#pt_native_display")
          .focusout(function(){
              annotate_pt_native_label(corpus);
          });

      //Autoselect the english display element
      $('#pt_eng_display').focus().select();
  };
};

// Create a wordcloud (not a venncloud) from a single corpus of utterances
function wordcloud_from_utterances(corpus, utterances_list, waveform_visualizer){
    var corpus_closure = new CorpusClosureForSetupAnnotatePseudotermID(corpus, waveform_visualizer);

    options = {};
    options.click = corpus_closure.set_up_annotate_pseudoterm_id;

    u = utterances_list;
    $.when(get_cloud_data(corpus, u[0] )).done( function(){
        make_me_a_venncloud( cloud_datasets, options );
    });
}

function venncloud_from_utterances(corpus, utterances_lists, waveform_visualizer){
    var corpus_closure = new CorpusClosureForSetupAnnotatePseudotermID(corpus, waveform_visualizer);

    options = {};
    options.click = corpus_closure.set_up_annotate_pseudoterm_id;

    //options.wordcloud_element = 'cloud_data_landing_zone';

    //$.when(get_multiple_utterances_cloud_data(utterances_lists)).done( function(){
    //HARDCODED below for the nonce.
    u = utterances_lists;
    $.when(get_cloud_data(corpus, u[0] ), get_cloud_data(corpus, u[1] )).done( function(){
        //user cloud datasets
        make_me_a_venncloud( cloud_datasets, options );
    });
}
