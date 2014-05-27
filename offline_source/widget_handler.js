
function place_pseudoterm_template( pt_id, landing_zone ){
    var landing_zone = landing_zone || '#pt_template_landing_zone';
    /*
      $.ajax({
            url:"http://localhost:12321/www/pseudoterm_template.html",
                type:"GET",
                data:{},
                error: function(xhr, error) {
                alert('Error!  Status = ' + xhr.status + ' Message = ' + error);
            },
                success: function(data){
                $(landing_zone).html(data);
            }
        });
    */
    $.get("http://localhost:12321/www/pseudoterm_template.html",
          function(data){
              alert(landing_zone);
              $(landing_zone).html(data);
          });

        
};
