function show ( name )
{
    var elem = document.getElementById(name);
    if ( elem )
        elem.style.display = "block";
}

function hide ( name )
{
    var elem = document.getElementById(name);
    if ( elem )
        elem.style.display = "none";
}     
