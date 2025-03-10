const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;


// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname);

// Serve static files (CSS, images)
app.use(express.static(path.join(__dirname, 'public')));



// Connect to SQLite database
const dbPath = path.join(__dirname, 'db', 'rtfilms.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});



app.get('/', (req, res) => {
    let movieTitle = req.query.title;

    if (!movieTitle) {
        return res.send('Error: No movie title provided.');
    }

    movieTitle = movieTitle.toLowerCase();

    // Query movie
    const movieQuery = `SELECT * FROM Films WHERE LOWER(FilmCode) = ?`;
    db.get(movieQuery, [movieTitle], (err, movie) => {
        if (err) {
            console.error('Database error:', err);
            return res.send('Error: Database query failed.');
        }

        if (!movie) {
            console.log('Movie not found:', movieTitle);
            return res.send('Error: Movie not found.');
        }

        const movieFolder = movie.FilmCode.toLowerCase();

        const pngPath = path.join(__dirname, 'public', movieFolder, 'poster.png');
        const jpgPath = path.join(__dirname, 'public', movieFolder, 'poster.jpg');

        let posterFilename = '';

        if (fs.existsSync(pngPath)) {
            posterFilename = 'poster.png';
        } else if (fs.existsSync(jpgPath)) {
            posterFilename = 'poster.jpg';
        }


        // Query reviews
        const reviewQuery = `SELECT * FROM Reviews WHERE LOWER(FilmCode) = ?`;
        db.all(reviewQuery, [movieTitle], (err, reviews) => {
            if (err) {
                console.error('Error retrieving reviews:', err);
                return res.send('Error retrieving reviews.');
            }


            // Query FilmDetails
            const detailsQuery = `SELECT Attribute, Value FROM FilmDetails WHERE LOWER(FilmCode) = ? ORDER BY rowid ASC`;
            db.all(detailsQuery, [movieTitle], (err, details) => {
                if (err) {
                    console.error('Error retrieving film details:', err);
                    return res.send('Error retrieving film details.');
                }

                let orderedMovieDetails = [];
                let movieLinks = [];

                details.forEach(detail => {
                    if (detail.Attribute === "Links") {
                        const linkPairs = detail.Value.split(', ');
                        linkPairs.forEach(pair => {
                            const parts = pair.split(': ');
                            if (parts.length === 2) {
                                movieLinks.push({ name: parts[0].trim(), url: parts[1].trim() });
                            }
                        });
                    } else {
                        orderedMovieDetails.push({ key: detail.Attribute, value: detail.Value });
                    }
                });


                let freshStatus = movie.Score >= 60 ? "freshbig.png" : "rottenbig.png";

                
                res.render('movie', { 
                    movie, 
                    reviews, 
                    freshStatus, 
                    orderedMovieDetails, 
                    movieLinks, 
                    posterFilename, 
                    movieFolder
                });
            });
        });
    });
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});