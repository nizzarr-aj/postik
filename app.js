function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}
function selectService(name){scrollToId('pricing');}
function order(title,price){document.getElementById('mt').textContent=title;document.getElementById('mp').textContent=price;document.getElementById('modal').classList.remove('hidden');}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
function submitOrder(){const u=document.getElementById('url').value.trim();if(!u){alert('Ajoutez le lien de votre profil ou vidéo.');return;}alert('Commande préparée. Le paiement sécurisé sera connecté dans la prochaine étape.');closeModal();}