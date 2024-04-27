// JavaScript Document
function sing_in()
{
	var nom =document.getElementById('').value;
	var prénom =document.getElementById('').value;
	var date =document.getElementById('').value;
	var number =document.getElementById('').value;
	var Email=document.getElementById('').value;
	var mytest = new RegExp();
	mytest = /[a-Z]/i;
	if (mytest.test(nom))== false{
		alert('Entrez votre nom correct')
	}
	
	
}