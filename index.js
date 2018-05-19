const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const {
  getInstitutions,
  getInstitution,
  getSchool,
  loginExamTaker,
  getExamTakerDetails,
  getExams
} = require('./db');

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
    console.log(`Institution school name request: ${req.params.schoolname}`);
    try {
      const inst = await getInstitution(req.params.schoolname);
      // console.log(`Response: \n${JSON.stringify(inst)}`);
      res.json(inst);
    } catch (e) {
      res.status(e.status || 400);
      res.json({ success: false, error: e.message });
    }
  }
);

app.get('/api/draft/schools/id/:id', async (req, res) => {
  console.log(`Institution id request: ${req.params.id}`);
  try {
    const school = await getSchool(req.params.id);
    // console.log(`Response: \n${JSON.stringify(school)}`);
    res.json(school);
  } catch (e) {
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

app.post('/api/draft/examtaker/me', async (req, res) => {
  console.log(req.body);
  try {
    const et = await loginExamTaker(req.body);
    // console.log(`Response: \n${JSON.stringify(et)}`);
    res.json(et);
  } catch (e) {
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
  res.status(404);
  res.json({ success: false });
});

app.post('/api/draft/exams/getAvailableExams', async (req, res) => {
  try {
    const examList = await getExams(req.headers.authorization.split(' ')[1]);
    console.log(`result getAvailableExams: ${JSON.stringify(examList)}`);
    res.json(examList);
  } catch (e) {
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/draft/examtaker/examtakerDetails', async (req, res) => {
  try {
    const details = await getExamTakerDetails(
      req.headers.authorization.split(' ')[1]
    );
    console.log(`result examtakerDetails: ${JSON.stringify(details)}`);
    res.json(details);
  } catch (e) {
    res.status(e.status || 404);
    res.json({ success: false, error: e.message });
  }
});

app.get('*', (req, res) => {
  res.status(404);
  res.json({ success: 'false' });
});

app.post('*', (req, res) => {
  res.status(404);
  res.json({ success: 'false' });
});

app.listen(8080, () => {
  console.log('listening on 8080');
});
