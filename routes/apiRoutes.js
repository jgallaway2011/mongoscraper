var axios = require("axios");
var cheerio = require("cheerio");
var db = require("../models");

module.exports = function (app) {
    app.get("/api/scrape", function (req, res) {
        // First, we grab the body of the html with request
        axios.get("https://www.nytimes.com/section/us").then(function (response) {
            // Then, we load that into cheerio and save it to $ for a shorthand selector
            var $ = cheerio.load(response.data);

            $("div.css-1l4spti").each(function (i, element) {

                var result = {};

                result.title = $(this).find("h2").text();
                result.link = $(this).find("a").attr("href");
                result.summary = $(this).find("p.css-1echdzn").text();
                result.image = $(this).find("figure").find("img").attr("src");

                db.Article.create(result)
                    .then(function (dbArticle) {
                        // View the added result in the console
                        console.log(dbArticle);
                    })
                    .catch(function (err) {
                        // If an error occurred, send it to the client
                        return res.json(err);
                    });
            });
        });
    });

    // Route for chaning state of article to true for the saved boolean
    app.post("/api/save/:id", function (req, res) {
        db.Article.findOneAndUpdate({ _id: req.params.id }, { "saved": true })
            .then(function (dbArticle) {
                console.log(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                return res.json(err);
            });
    });

    // Route for chaning state of article and associated notes to false for the saved boolean
    app.post("/api/unsave/:id", function (req, res) {
        db.Article.findOneAndUpdate({ _id: req.params.id }, { "saved": false })
            .then(function (dbArticle) {
                console.log("This is dbArticle after clicking unsave:", dbArticle);
                return db.Note.updateMany({ article : dbArticle._id }, { "saved": false });
            })
            .then(function () {
                // If we were able to successfully update a Note, send it back to the client
                return db.Article.find({"saved" : true})
            }).then(function (dbArticle) {
                res.render("saved_articles", {dbArticle});
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for getting all notes related to an article
    app.get("/api/notes/:id", function (req, res) {
        db.Note.find({ article: req.params.id })
            .then(function (dbArticle) {
                console.log(dbArticle);
                return res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                return res.json(err);
            });
    });

    // Route for saving notes for articles
    app.post("/api/note/save/:id", function (req, res) {
        console.log("This is req.body: ", req.body);
        db.Note.create({
            body: req.body.body,
            article: req.params.id
        })
            .then(function (dbNote) {
                console.log("This note was saved ", dbNote);
                return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { note: dbNote._id } });
            })
            .then(function (dbArticle) {
                // If we were able to successfully update an Article, send it back to the client
                console.log("This is dbArticle: ", dbArticle);
                res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for saving notes for articles
    app.post("/api/note/delete/:id", function (req, res) {
        db.Note.findOneAndRemove({ _id: req.params.id })
            .then(function (dbNote) {
                console.log("This note was deleted: ", dbNote);
                return db.Article.findOneAndUpdate({ _id: dbNote.article }, { $pull: { note: dbNote._id } });
            })
            .then(function (dbArticle) {
                // If we were able to successfully update an Article, send it back to the client
                console.log("This is dbArticle: ", dbArticle);
                res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route to clear all docuemnts in Article collection in Articles database
    app.get("/api/clear", function (req, res) {
        db.Article.remove({"saved" : false})
            .then(function () {
                res.redirect("/api/clear/notes");
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                return res.json(err);
            });
    });

    // Route hit to clear all documents in Note collection after clearing out Article Collection
    app.get("/api/clear/notes", function (req, res) {
        db.Note.remove({"saved" : false})
            .then(function () {
                res.redirect("/");
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                return res.json(err);
            });
    });

    // Route for getting all Articles from the db
    app.get("/api/articles/all", function (req, res) {
        // Grab every document in the Articles collection
        db.Article.find({})
            .populate("note")
            .then(function (dbArticle) {
                // If we were able to successfully find Articles, send them back to the client
                res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for getting all Articles from the db
    app.get("/api/articles/saved", function (req, res) {
        // Grab every document in the Articles collection
        db.Article.find({ "saved": true })
            .populate("note")
            .then(function (dbArticle) {
                // If we were able to successfully find Articles, send them back to the client
                res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });

    // Route for getting all Articles from the db
    app.get("/api/articles/unsaved", function (req, res) {
        // Grab every document in the Articles collection
        db.Article.find({ "saved": false })
            .populate("note")
            .then(function (dbArticle) {
                // If we were able to successfully find Articles, send them back to the client
                res.json(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                res.json(err);
            });
    });
};
