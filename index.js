const app = require('express')()
const fs = require('fs')
const sqlite3 = require("sqlite3").verbose()
const User = require('./user')

//Configuration
const file = 'sqlite.db'
const exists = fs.existsSync(file)
const db = new sqlite3.Database(file)
const token = ''
const tokenSet = ''

db.serialize(function() {
    if (!exists)
        db.run("CREATE TABLE users (name TEXT, repo TEXT)")
})

//Affichage des commits
app.get('/', (req, res) => {
    // Vérification du token
    if (req.param('token') !== token)
        return res.send('Token not valid')

    let param = req.param('text') //le nom d'utilsateur sur slack
    db.all('SELECT * FROM users', (err, row) => {
        if (err)
            return res.send(err)

        let user = new User(param, row);
        //Affichage de la liste des utilisateurs
        if (param === 'list') {
            return res.json({
                text: "Liste des utilisateurs",
                attachments: user.list()
            })
        }

        //Affichage des commits
        //Recherche d'utilisateur dans la DB
        let dbUser = row.find((row) => row.name === param)

        //Réponse si utilisateur est introuvable
        if (typeof dbUser == 'undefined') {
            return res.send(`Aucun repo associé avec ${user}!`)
        }

        //Réponse json 
        user.fetchRepo(dbUser, (data) => {
            return res.json(user.formatResponse(data))
        })
    })
})

//Enregistrement du repo
app.get('/set', (req, res) => {
    // Vérification du token
    if (req.param('token') != tokenSet)
        return res.send('Token not valid')

    let user = req.param('user_name') //Pseudo sur slack
    let repo = req.param('text') //Le repo

    let insert = `INSERT INTO 'users' (name, repo) VALUES ('${user}', '${repo}')`
    let update = `UPDATE 'users' SET repo = '${repo}' WHERE name = '${user}'`

    db.all('SELECT * FROM users', (err, row) => {
        if (err)
            return res.send(err)

        //Premier enregistrement si utilisateur n'existe pas
        if (row.length === 0) {
            db.run(insert)
            return res.send('Enregistrement réussi')
        }

        //Vérification si utilisateur a déjà enregistré un repo
        let check = (item, user) => {
            return item.name === user
        }

        if (row.every(check, user)) {
            db.run(insert)
            return res.send('Enregistrement Réussi')
        } else {
            db.run(update)
            return res.json('Enregistrement Mis à Jour')
        }
    })
})

app.listen(8000)