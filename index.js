const app = require('express')()
const request = require('request')
const fs = require('fs')
const sqlite3 = require("sqlite3").verbose()

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

app.get('/', (req, res) => {
    // Vérification du token
    if (req.param('token') !== token)
        return res.send('Token not valid')

    let user = req.param('text') //le nom d'utilsateur sur slack
    db.all('SELECT * FROM users', (err, row) => {
        if (err)
            return res.send(err)

        //Affichage de la liste des utilisateurs
        if (user === 'list') {
            let response = []

            row.forEach((item) => {
                //Construction de réponse sur slack
                let userObject = {
                    author_name: item.name,
                    title: item.repo,
                    title_link: `https://github.com/${item.repo}`
                }

                response.push((userObject))
            })

            return res.json({
                text: "Liste des utilisateurs",
                attachments: response
            })
        }

        //Affichage des commits
        //Recherche d'utilisateur dans la DB
        let dbUser = row.find((row) => row.name === user)

        //Réponse si utilisateur est introuvable
        if (typeof dbUser == 'undefined') {
            return res.send(`Aucun repo associé avec ${user}! Slap HIM!`)
        }

        let response = []

        //Options pour le request
        let options = {
            url: `https://api.github.com/repos/${dbUser.repo}/commits`,
            json: true,
            headers: {
                'User-Agent': 'request'
            }
        }

        //Appel à l'API de Github
        request(options, (error, result, data) => {
            //Contrôle si le repo existe
            if (error)
                return res.send(`Repo Introuvable ${error}`)

            //Mise en forme de la réponse sur slack
            data.forEach((key) => {
                let message = {}
                let commitDate = Date.parse(key.commit.author.date)
                message.fallback = "Foo bar"
                message.author_name = key.commit.author.name
                message.title = key.commit.message
                message.title_link = key.html_url
                message.ts = commitDate / 1000

                response.push(message)
            })

            return res.json({
                text: "Liste des commits",
                attachments: response
            })
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
