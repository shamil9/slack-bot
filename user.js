class User {
    constructor(param, dbResults) {
        this.param = param
        this.dbResults = dbResults
        this.request = require('request')
        this.commits = []
    }

    list() {
        //Affichage de la liste des utilisateurs
        if (this.param === 'list') {
            let response = []

            this.dbResults.forEach((item) => {
                //Construction de réponse sur slack
                let userObject = {
                    author_name: item.name,
                    title: item.repo,
                    title_link: `https://github.com/${item.repo}`
                }

                response.push((userObject))
            })

            return response
        }
    }

    fetchRepo(user, callback) {
        //Options pour le request
        let options = {
            url: `https://api.github.com/repos/${user.repo}/commits`,
            json: true,
            headers: {
                'User-Agent': 'request'
            }
        }

        //Appel à l'API de Github
        this.request(options, (error, result, data) => {
            //Contrôle si le repo existe
            if (error || data.message === 'Not found')
                return (`Repo Introuvable ${error}`)

            return callback(data)
        })
    }

    formatResponse(data) {
        //Mise en forme de la réponse sur slack
        if (!data)
            return 'Erreur lors du traitement de la réponse'

        data.forEach((key) => {
            this.commits.push({
                fallback: "Foo bar",
                author_name: key.commit.author.name,
                title: key.commit.message,
                title_link: key.html_url,
                ts: Date.parse(key.commit.author.date) / 1000
            })
        })

        return {
            text: "Liste des commits",
            attachments: this.commits
        }
    }
}
module.exports = User