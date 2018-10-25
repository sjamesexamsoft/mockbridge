const fs = require('fs');
const path = require('path');
const jose = require('node-jose');

const institutions = JSON.parse(
  fs.readFileSync('db/institutions.json', 'utf8')
);
const keyBuff = Buffer.from(process.env.KEY_BUFFER, 'hex');

// assumption is that this async operation will complete long before any messages received
let key;
jose.JWK.asKey({ kty: 'oct', k: keyBuff }).then(jwk => (key = jwk));

function getInstitutions() {
  return institutions.schools;
}

function getInstitutionData(prop, filter) {
  return new Promise((resolve, reject) => {
    const inst = institutions[prop].filter(filter)[0];
    // console.log(`getInstitutionData: ${prop} ${JSON.stringify(inst)}`);
    if (inst && inst.fileName) {
      const p = path.join(__dirname, inst.fileName);
      try {
        fs.readFile(p, 'utf8', (err, data) => {
          if (err) {
            reject({ status: 400, message: err });
          } else {
            resolve(JSON.parse(data));
          }
        });
      } catch (e) {
        reject({ status: 400, message: e.message });
      }
    } else {
      reject({ status: 404, message: 'Institution Not Found' });
    }
  });
}

function getInstitutionByName(schoolName) {
  return getInstitutionData(
    'institutions_by_name',
    i => i.schoolName == schoolName
  );
}

function getInstitutionById(id) {
  return getInstitutionData('institutions_by_id', i => i.id == id);
}

function getInstitution(schoolName) {
  return new Promise((resolve, reject) => {
    getInstitutionByName(schoolName)
      .then(instDetails => {
        resolve(instDetails.institutionInfo);
      })
      .catch(e => reject(e));
  });
}

function getSchool(id) {
  return new Promise((resolve, reject) => {
    getInstitutionById(id)
      .then(instDetails => {
        resolve(instDetails.school);
      })
      .catch(e => reject(e));
  });
}

function loginExamTaker({ studentId, password, institutionCode }) {
  return new Promise((resolve, reject) => {
    const et = getExamTakerByInstName(studentId, institutionCode)
      .then(et => {
        if (et.password == password) {
          resolve(et.info);
        } else {
          reject({ status: 403, message: 'authentication failure' });
        }
      })
      .catch(e => reject({ status: 403, message: 'authentication failure' }));
  });
}

// function getExamTakerByInstName(studentId, institutionName) {
//   return new Promise((resolve, reject) => {
//     const instFileName = getInstitutionByName(schoolName);
//     if (instFileName) {
//       const p = path.join(__dirname, instFileName);
//       try {
//         fs.readFile
//       }
//     }

//   })
//   const inst = institutions.institutions_by_name.filter(
//     i => i.schoolName == institutionCode
//   )[0];
//   if (inst) {
//     const p = path.join(__dirname, inst.fileName);
//     try {
//       const instDetails = JSON.parse(fs.readFileSync(p, 'utf8'));
//       return instDetails.examTakers.filter(et => et.studentId === studentId)[0];
//     } catch (e) {}
//   }
// }

function getExamTakerByInstId(studentId, institutionId) {
  return new Promise((resolve, reject) => {
    getInstitutionById(institutionId)
      .then(inst => {
        const et = inst.examTakers.filter(et => et.studentId === studentId)[0];
        if (et) {
          const p = path.join(
            __dirname,
            inst.schoolId,
            et.userId,
            'et.info.json'
          );
          console.log(p);
        } else {
          reject({ success: false, error: e });
        }
      })
      .catch(e => reject({ success: false, error: e }));
  });
}

function getExamTakerByInstName(studentId, institutionName) {
  return new Promise((resolve, reject) => {
    getInstitutionByName(institutionName)
      .then(inst => {
        // console.log(`inst: ${JSON.stringify(inst)}`);
        const et = inst.examTakers.filter(et => et.studentId === studentId)[0];
        if (et) {
          console.log(`${studentId} ${JSON.stringify(et)}`);
          const p = path.join(
            __dirname,
            'db',
            `${inst.schoolId}`,
            `${et.userId}`,
            'etinfo.json'
          );
          fs.readFile(p, 'utf8', (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(JSON.parse(data));
            }
          });
        } else {
          reject('et not found');
        }
      })
      .catch(e => reject(e));
  });
}

function getExamTakerDetails(authToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const { userId, schoolId } = await decodeAuthToken(authToken);
      const inst = await getInstitutionById(schoolId);
      const p = path.join(
        __dirname,
        'db',
        `${schoolId}`,
        `${userId}`,
        'etdetails.json'
      );
      fs.readFile(p, 'utf8', (err, data) => {
        if (err) {
          reject({ status: 404, message: err });
        } else {
          resolve(JSON.parse(data));
        }
      });
    } catch (e) {
      reject({ status: 400, message: e.message });
    }
  });
}

function getExams(authToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const { userId, schoolId } = await decodeAuthToken(authToken);
      const inst = await getInstitutionById(schoolId);
      const p = path.join(
        __dirname,
        'db',
        `${schoolId}`,
        `${userId}`,
        'exams.json'
      );

      fs.readFile(p, 'utf8', (err, data) => {
        if (err) {
          reject({ status: 404, message: err });
        } else {
          resolve(JSON.parse(data));
        }
      });
    } catch (e) {
      reject({ status: 400, message: e.message });
    }
  });
}

function getExamManifest(authToken, examId) {
  return new Promise(async (resolve, reject) => {
    try {
      const { userId, schoolId } = await decodeAuthToken(authToken);
      const p = path.join(
        __dirname,
        'db',
        `${schoolId}`,
        `${userId}`,
        'exams',
        `${examId}.manifest`
      );
      // console.log(`exam manifest: ${p}`);
      fs.readFile(p, 'utf8', (err, data) => {
        if (err) {
          reject({ status: 404, message: err });
        } else {
          const manifest = JSON.parse(data);
          manifest.examDownloadURL = path.join(
            'db',
            `${schoolId}`,
            `${userId}`,
            'exams',
            `${examId}.zip`
          );
          resolve(manifest);
        }
      });
    } catch (e) {
      reject({ status: 400, message: e.message });
    }
  });
}

function readExamFile(schoolId, userId, examfile, range) {
  return new Promise(async (resolve, reject) => {
    try {
      const p = path.join(
        __dirname,
        'db',
        `${schoolId}`,
        `${userId}`,
        'exams',
        `${examfile}`
      );
      console.log(`examfile: ${p}`);
      fs.readFile(p, (err, data) => {
        if (err) {
          reject({ status: 404, message: e.message });
        } else {
          resolve(data);
        }
      });
      // fs.open(p, (err, fd) => {
      //   if (err) {
      //     reject({ status: 404, message: err });
      //   } else {
      //     let data = Buffer.alloc(1024);
      //     fs.read(fd, data, 0, 1024, range[0], (err, data) => {
      //       if (err) {
      //         reject({ status: 500, message: err });
      //       } else {
      //         resolve(data);
      //       }
      //     });
      //   }
      // });
    } catch (e) {
      reject({ status: 400, message: e.message });
    }
  });
}

function readFile(fd, offset, size) {
  return new Promise((resolve, reject) => {});
}

function decodeAuthToken(authToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await jose.JWE.createDecrypt(key).decrypt(authToken);
      json = result.plaintext.toString('ascii');
      // console.log(json);
      resolve(JSON.parse(json));
    } catch (e) {
      reject({ message: 'invalid authorization' });
    }
  });
}

module.exports = {
  getInstitutions,
  getInstitution,
  getSchool,
  loginExamTaker,
  getExamTakerDetails,
  getExams,
  getExamManifest,
  readExamFile
};
