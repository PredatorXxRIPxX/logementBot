const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const router = require('./Routes/api');
const cors = require('cors');

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', router);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

