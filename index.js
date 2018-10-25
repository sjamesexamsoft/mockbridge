const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const {
  getInstitutions,
  getInstitution,
  getSchool,
  loginExamTaker,
  getExamTakerDetails,
  getExams,
  getExamManifest,
  readExamFile
} = require('./db');

let filteredExam = '';

const examtaker_InstitutionInfo_unknown = {
  status: 403,
  response: {
    code: 'Invalid institution provided.',
    message: 'Institution ID that was provided does  not exist'
  }
};

const schools_id_unknown = {
  status: 403,
  response: {
    code: 'Invalid institution provided.',
    message: 'Institution ID that was provided does  not exist'
  }
};

const app = express();

app.use(morgan('combined'));

app.use(bodyParser.json());

app.use(cors());

app.get('/capi', (req, res) => {
  res.json(getInstitutions());
});

app.get(
  '/api/draft/examtaker/InstitutionInfo/:schoolname',
  async (req, res) => {
    // console.log(`Institution school name request: ${req.params.schoolname}`);
    try {
      const inst = await getInstitution(req.params.schoolname);
      // console.log(`Response: \n${JSON.stringify(inst)}`);
      res.json(inst);
    } catch (e) {
      console.log(`Catch: ${e.message}`);
      res.status(e.status || 400);
      res.json({ success: false, error: e.message });
    }
  }
);

app.get('/api/draft/schools/id/:id', async (req, res) => {
  // console.log(`Institution id request: ${req.params.id}`);
  try {
    const school = await getSchool(req.params.id);
    // console.log(`Response: \n${JSON.stringify(school)}`);
    res.json(school);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 400);
    res.json({ success: false, error: e.message });
  }
});

app.get(
  '/api/draft/examtaker/sendRegistrationEmail/:mangledString',
  (req, res) => {
    res.status(200);
    res.json({ success: true });
  }
);

app.get('/api/draft/exams/downloadExamBundle/:examId', async (req, res) => {
  try {
    const manifest = await getExamManifest(
      req.headers.authorization.split(' ')[1],
      req.params.examId
    );
    manifest.examDownloadURL = `http://${req.headers.host}/${
      manifest.examDownloadURL
    }`;
    res.json(manifest);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.get('/db/:schoolid/:userid/exams/:examfile', async (req, res) => {
  // console.log(`${JSON.stringify(req.headers.range)}`);
  const range = req.headers.range
    .match(/.*=(\d+)-(\d*)/)
    .slice(1, 3)
    .map(x => +x);
  console.log(range);
  try {
    const { schoolid, userid, examfile } = req.params;
    const buffer = await readExamFile(schoolid, userid, examfile, range);
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Range', `bytes 0-${buffer.length}/${buffer.length}`);
    res.send(buffer);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/draft/examtaker/me', async (req, res) => {
  try {
    const et = await loginExamTaker(req.body);
    res.json(et);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 403);
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/draft/examtaker/register', (req, res) => {
  console.log(req.body);
  res.status(200);
  res.send('true');
});

app.post('api/draft/versions/checkForUpdate', (req, res) => {
  // TODO: provide JSON for updates
  res.status(404);
  res.json({ success: false });
});

app.post('/api/draft/exams/getAvailableExams', async (req, res) => {
  try {
    let examList = await getExams(req.headers.authorization.split(' ')[1]);
    examList = examList.filter(exam => exam.examListingId != filteredExam);
    res.json(examList);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/draft/examtaker/examtakerDetails', async (req, res) => {
  // res.status(404);
  // res.json({ success: false, error: 'test failure' });
  // return;
  try {
    const details = await getExamTakerDetails(
      req.headers.authorization.split(' ')[1]
    );
    res.json(details);
  } catch (e) {
    console.log(`Catch: ${e.message}`);
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/draft/exams/downloadComplete', (req, res) => {
  console.log(JSON.stringify(req.body));
  if (process.env.NETWORK_ERROR == req.body.examListingId) {
    res.status(parseInt(process.env.NETWORK_ERROR_STATUS));
    res.statusMessage = process.env.NETWORK_ERROR_MESSAGE;
    if (process.env.FILTERED_EXAM) {
      // filteredExam is removed from next exam list
      // Simulates successful downloadComplete with 5xx return
      filteredExam = req.body.examListingId;
      console.log('Filtered exam: ' + filteredExam);
    }
    res.send();
  } else {
    res.send('1');
  }
  // To test the issue with exam list refresh during download complete
  // setTimeout(() => res.send('1'), 3000);
  // To test gateway timeout issue with download complete
});

app.get('*', (req, res) => {
  res.status(404);
  res.json({ success: 'false' });
});

app.post('*', (req, res) => {
  res.status(404);
  res.json({ success: 'false' });
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(process.env.PORT || 9090, () => {
  console.log(`listening on ${process.env.PORT || 9090}`);
});
