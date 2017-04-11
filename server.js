//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');  // require ist die Art Funktionen zu importieren, die dann alle Unter der Variable http gespeichert sind
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) { // Wenn die Verbindung steht
    messages.forEach(function (data) { // Alle Nachrichten mal schicken. forEach ist ein Funktion die ein Array hat und die als
                                       // Parameter eine Funktion erwartet, der jedes einzelne Array Element übergeben wird
      socket.emit('message', data);
    });

    sockets.push(socket); // ergänzt die Liste von Sockets (Socket, Englisch für Steckdose), hier sind die Zustande ge-
                          // kommenen Verbindungen gemein socket wurde ja übergeben

    socket.on('disconnect', function () { // Ein Listener Einrichten wenn die Verbindung getrennt wird
      sockets.splice(sockets.indexOf(socket), 1); // Dann das Socket aus dem Array entfernen. Ein gutes Beispiel für ein Closure
      updateRoster(); // Namensliste updaten, siehe Funktion unten
    });

    socket.on('message', function (msg) { // Reagiert auf socket.emit('message', variable) vom Browsercode
      
      console.log('Nachricht erhalten:', msg);
      
      var text = String(msg || ''); // || bedeutet ODER (nicht String-Konkatinierung wie im PL/SQL)
                                    // Wenn msg also leer wäre dann würde der leere String benutzt werden (So bisschen wie NVL(msg, '') ) 
                                    // String() selbst, heisst einfach, mache eine Stringvariable daraus auch wenn es was anders ist
      if (!text) // Bei einem leeren String würde das true ergeben, sonst false
        return;

      socket.get('name', function (err, name) { // Den Namen erhalten, selbst das ist Asynchron
                                                // Unten beim reagiren auf emit('name', name) wird Name gesetzt
                                                // (set/get sind deprecated aber dieses Beispiel benutzt es noch)
        var data = {
          name: name,
          text: text                            // Auch wieder ein gutes Beispiel für ein Closure, obwohl text ausserhalb der Callback Routine gesetzt ist, kann er verwendet werden
        };

        broadcast('message', data);             // Jetzt an alle die Nachricht verteilen, siehe unten
        messages.push(data);                    // Nachricht im Array von Nachrichten aufnehmen
      });
    });

    socket.on('identify', function (name) {
      console.log('im Callback für identify:', name)
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {   // Wird oben bei Disconnect aufgerufen, was passiert den hier
  async.map(                // async wurde oben per Require zugefügt, eines der vielen vielen Module die über Nodes Package Manager verfügbar sind und hier unter nodes_modules local verfügbar ist
    sockets,                // Das ist der Array
    function (socket, callback) { // Für jedes Socket wird der Name geholt, callback wird jedesmal aufgerufen, und ein neuer array wird erstellt aus dem Ergebnis der Callback Aufrufe
      socket.get('name', callback);  // Aufrufen async cllback wenn get (der auch Asynchron ist) fertig ist. Ergibt Serie von Callback aufrufen mit je einem Namen
    },
    function (err, names) {   // Wenn alle Namen durchen sind, wir dies final mit dem neuen Array aufgerufen
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) { // An alle Sockets senden was immer in event und data steht
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

// Hauptroutine Auf Port 3000 zuhören. Das übersetzt Cloud9 dann für uns in workspacename bindestrich username z.B. eben https://seminar4-hol42.c9users.io/

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
