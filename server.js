// Importation des modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Importer SQLite3
const session = require('express-session');

// Création de l'application Express
const app = express();

// Création du serveur HTTP
const server = http.createServer(app);

// Création de server
const io = socketIo(server);

// Définition du dossier des ressources statiques (public ou assets)
const publicDirectoryPath = path.join(__dirname, 'public'); // Remplacez 'public' par 'assets' si nécessaire

// Configuration de l'application Express pour utiliser le dossier public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));


const sessionMiddleware = session({
    secret: "changeit",
    resave: true,
    saveUninitialized: true,
  });
// Configuration de la session
app.use(sessionMiddleware);

// Connexion à la base de données SQLite
const dbPath = path.join(__dirname, 'mydata.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données :', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie.');
  }
});
const db2 = new sqlite3.Database(path.join(__dirname, 'metadata.db'), (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données :', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie.');
  }
});

// Définition d'une route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});
// Définition d'une route pour la page d'accueil
app.get('/account', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'account.html'));
});
// Définition d'une route pour la page d'accueil
app.get('/main', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'main.html'));
});
// Définition d'une route pour la page d'accueil
app.get('/forms', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'form.html'));
});
// Définition d'une route pour la page d'accueil
app.get('/setting', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'setting.html'));
});
// Définition d'une route pour la page d'accueil
app.get('/result', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'result.html'));
});

io.engine.use(sessionMiddleware);
// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Nouvelle connexion WebSocket établie');
  
    // Access the session from the handshake object
    const session = socket.request.session;
    
    socket.on('logout', () => {
        session.userId = "";
        session.password = "";
        session.save();
    });
    socket.on('login_test', () => {
      if (session.userId !== null && session.password !== null) {
          db.get('SELECT * FROM login WHERE id = ? AND password = ?', [session.userId, session.password], (err, row) => {
            if (err) {
              console.error('Erreur lors de la vérification de l\'authentification :', err.message);
            } else if (!row) {
              session.userId = "";
              session.password = "";
              session.save();
              console.error('You are disconnected');
              socket.emit('login_result', { success: false, message: 'You are disconnected' });
            } else {
              console.error('You are connected');
              socket.emit('login_result', { success: true, message: 'You are connected' });
            }
          });
      }
    });
  
    socket.on('login', (credentials) => {
      const { username, password } = credentials;
      // Vérifier l'authentification dans la base de données
      db.get('SELECT * FROM login WHERE id = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
          console.error('Erreur lors de la vérification de l\'authentification :', err.message);
          socket.emit('login_result', { success: false, message: 'Erreur lors de la vérification de l\'authentification' });
        } else if (!row) {
          socket.emit('login_result', { success: false, message: 'Identifiants incorrects' });
          session.userId = "";
          session.password = "";
          session.save();
        } else {
          session.userId = row.id;
          session.password = row.password;
          session.save();
          socket.emit('login', row.id);
          socket.emit('login_result', { success: true, message: 'Authentification réussie' });
        }
      });
    });
  
    // Gestion des événements
    socket.on('path', (msg) => {
      console.log('Message reçu : ' + msg);
      db.run('UPDATE config SET value = ? WHERE name = ?', [msg, 'path'], function(err) {
        if (err) {
          console.error('Erreur lors de la mise à jour du chemin dans la table de configuration :', err.message);
        } else {
          console.log('Chemin mis à jour dans la table de configuration');
        }
    });
    socket.on('start', (metadata) => {
      // Exécuter la commande CMD pour démarrer le script Python
      exec('python bot.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Erreur lors de l\'exécution de la commande :', error);
          return;
        }
        // Afficher la sortie de la commande
        console.log('Sortie de la commande :', stdout);
        // Afficher les erreurs de la commande
        console.error('Erreurs de la commande :', stderr);
      });
    });
    socket.on('metadata', (metadata) => {
      try {
        // Parse the JSON string received from the client
        const metadata = JSON.parse(metadataJson);
    
        // Update the config table with the new metadata values
        db.run('UPDATE config SET value = ? WHERE name = ?', [metadataJson, 'metadata'], function(err) {
          if (err) {
            console.error('Erreur lors de la mise à jour des métadonnées dans la table de configuration :', err.message);
          } else {
            console.log('Métadonnées mises à jour dans la table de configuration');
          }
        });
    } catch (error) {
      console.error('Erreur lors de l\'analyse des données JSON :', error.message);
    }
  });
  socket.on('result', () => {
    // Sélectionner toutes les entrées de la table files
    db.all('SELECT * FROM files', (err, rows) => {
      if (err) {
        console.error('Erreur lors de la sélection des résultats depuis la table files :', err.message);
        return;
      }
      // Émettre les résultats sélectionnés via Socket.IO
      socket.emit('filesResult', rows);
    });
  });
  
    // Gestion de la déconnexion
    socket.on('disconnect', () => {
      console.log('Connexion WebSocket terminée');
    });
  });
});
  

// Démarrage du serveur
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`application is running at: http://localhost:${port}`);
});
