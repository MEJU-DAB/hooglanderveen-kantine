// Klok + datum
function updateKlok() {
  var klok = document.getElementById('klok');
  if (!klok) return;
  var nu = new Date();
  klok.textContent =
    nu.getHours().toString().padStart(2, '0') + ':' +
    nu.getMinutes().toString().padStart(2, '0');
}

function updateDatum() {
  var datum = document.getElementById('datum');
  if (!datum) return;
  datum.textContent = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

updateKlok();
updateDatum();
setInterval(updateKlok, 1000);

// Datum wisselt om middernacht
(function scheduleMiddernacht() {
  var nu = new Date();
  var msNacht = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + 1).getTime() - nu.getTime();
  setTimeout(function() { updateDatum(); scheduleMiddernacht(); }, msNacht);
})();

// Poll: herlaad de pagina als pushedAt verandert (admin heeft gepusht)
var huidigePushedAt = null;

function poll() {
  fetch('/api/berichten?lite=1')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (huidigePushedAt === null) {
        huidigePushedAt = d.pushedAt;
        return;
      }
      if (d.pushedAt !== huidigePushedAt) {
        window.location.reload();
      }
    })
    .catch(function() {});
}

// Eerste poll na 5s zodat huidigePushedAt wordt gezet
setTimeout(poll, 5000);
setInterval(poll, 60000);

// Herlaad direct bij terugkeer van slaapstand / achtergrondtab
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') poll();
});
