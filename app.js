import express from 'express';
import { Pool } from 'pg'; // Import the Pool from pg
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: ["http://cwserives.in"],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

const dbUrl = new URL(process.env.DB_CONNECTION);

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: dbUrl.pathname.substr(1),
  port: process.env.DB_PORT, // Make sure you set DB_PORT in your .env file
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'public/images');
  },
  filename: (_req, file, cb) => {
    cb(
      null,
      file.fieldname + '_' + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});


app.get('/getEmployee', (_req, res) => {
    const sql = "SELECT * FROM engineer";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
})

app.get('/get/:E_id', (req, res) => {
    const E_id = req.params.E_id;
    const sql = "SELECT * FROM engineer where E_id = ?";
    con.query(sql, [E_id], (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
})

/// update engineer
app.put('/update/:id', (req, res) => {
  const id = req.params.id;
  const { name, E_id, email, address, mobileNo, password } = req.body;
  const query = 'UPDATE engineer SET name = ?, E_id = ?, email = ?, address = ?, mobileNo = ?, password =? WHERE E_id = ?';

  con.query(query, [name, E_id, email, address, mobileNo, password, id], (error, result) => {
    if (error) {
      console.error('Error updating employee data:', error);
      res.status(500).json({ Status: 'Error' });
    } else {
      console.log('Employee data updated successfully');
      res.status(200).json({ Status: 'Success' });
    }
  });
});

app.delete('/delete/:E_id', (req, res) => {
    const E_id = req.params.E_id;
    const sql = "DELETE  FROM engineer WHERE E_id = ?";
    con.query(sql, [E_id], (err, _result) => {
        if(err) return res.json({Error: "delete employee error in sql"});
        return res.json({Status: "Success"})
    })
})

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if(!token) {
        return res.json({Error: "You are no Authenticated"});
    } else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if(err) return res.json({Error: "Token wrong"});
            req.role = decoded.role;
            req.E_id = decoded.E_id;
            next();
        } )
    }
}

app.get('/dashboard',verifyUser, (req, res) => {
    return res.json({Status: "Success", role: req.role, id: req.id})
})
app.get('/CCOdashboard',verifyUser, (req, res) => {
    return res.json({Status: "Success", role: req.role, id: req.id})
})

app.get('/adminCount', (_req, res) => {
    const sql = "Select count(id) as admin from users";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in runnig query"});
        return res.json(result);
    })
})
app.get('/employeeCount', (_req, res) => {
    const sql = "Select count(E_id) as engineer from engineer";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in runnig query"});
        return res.json(result);
    })
})

app.get('/salary', (_req, res) => {
    const sql = "Select sum(salary) as sumOfSalary from employee";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in runnig query"});
        return res.json(result);
    })
})

// app.post('/login', (req, res) => {
//     const sql = "SELECT * FROM users Where email = ? AND  password = ?";
//     con.query(sql, [req.body.email, req.body.password], (err, result) => {
//         if(err) return res.json({Status: "Error", Error: "Error in runnig query"});
//         if(result.length > 0) {
//             const id = result[0].id;
//             const token = jwt.sign({role: "admin"}, "jwt-secret-key", {expiresIn: '1d'});
//             res.cookie('token', token);
//             return res.json({Status: "Success"})
//         } else {
//             return res.json({Status: "Error", Error: "Wrong Email or Password"});
//         }
//     })
// })
app.post('/login', (req, res) => {
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  con.query(sql, [req.body.email, req.body.password], (err, result) => {
    if (err) {
      return res.json({ Status: "Error", Error: "Error in running query" });
    }
    if (result.length > 0) {
      const id = result[0].id;
      const token = jwt.sign({ role: "admin" }, "jwt-secret-key", {
        expiresIn: '1h',
      });
      res.cookie('token', token, { httpOnly: true });
      return res.json({ Status: "Success", token });
    } else {
      return res.json({
        Status: "Error",
        Error: "Wrong Email or Password",
      });
    }
  });
});



app.post('/employeelogin', (req, res) => {
    const sql = "SELECT * FROM engineer Where E_id = ? AND  password = ?";
    con.query(sql, [req.body.E_id, req.body.password], (err, result) => {
        if(err) return res.json({Status: "Error", Error: "Error in runnig query"});
        if(result.length > 0) {
            const E_id = result[0].E_id;
            const token = jwt.sign({role: "admin"}, "jwt-secret-key", {expiresIn: '1d'});
            res.cookie('token', token);
            return res.json({Status: "Success"})
        } else {
            return res.json({Status: "Error", Error: "Wrong E_id or Password"});
        }
    })
})

///////ccologin
app.post('/ccologin', (req, res) => {
  const sql = "SELECT * FROM cco_login Where cco_id = ? AND  password = ?";
  con.query(sql, [req.body.cco_id, req.body.password], (err, result) => {
      if(err) return res.json({Status: "Error", Error: "Error in runnig query"});
      if(result.length > 0) {
          const cco_id = result[0].cco_id;
          const token = jwt.sign({role: "admin"}, "jwt-secret-key", {expiresIn: '1d'});
          res.cookie('token', token);
          return res.json({Status: "Success"})
      } else {
          return res.json({Status: "Error", Error: "Wrong Email or Password"});
      }
  })
})

// app.post('/employeelogin', (req, res) => {
//     const sql = "SELECT * FROM employee Where email = ?";
//     con.query(sql, [req.body.email], (err, result) => {
//         if(err) return res.json({Status: "Error", Error: "Error in runnig query"});
//         if(result.length > 0) {
//             bcrypt.compare(req.body.password.toString(), result[0].password, (err, response)=> {
//                 if(err) return res.json({Error: "password error"});
//                 if(response) {
//                     const token = jwt.sign({role: "employee", id: result[0].id}, "jwt-secret-key", {expiresIn: '1d'});
//                     res.cookie('token', token);
//                     return res.json({Status: "Success", id: result[0].id})
//                 } else {
//                     return res.json({Status: "Error", Error: "Wrong Email or Password"});
//                 }
                
//             })
            
//         } else {
//             return res.json({Status: "Error", Error: "Wrong Email or Password"});
//         }
//     })
// })

// app.get('/employee/:id', (req, res) => {
//     const id = req.params.id;
//     const sql = "SELECT * FROM employee where id = ?";
//     con.query(sql, [id], (err, result) => {
//         if(err) return res.json({Error: "Get employee error in sql"});
//         return res.json({Status: "Success", Result: result})
//     })
// })




app.get('/logout', (_req, res) => {
    res.clearCookie('token');
    return res.json({Status: "Success"});
})


app.get('/logout', (req, res) => {
  // Clear the session data
  req.session.destroy(err => {
    if (err) {
      console.log('Error occurred during logout:', err);
    } else {
      // Redirect the user to the login page or any other appropriate page
      res.redirect('/login');
    }
  });
});


app.post('/create', (req, res) => {
    const sql = "INSERT INTO engineer ( eid , name , email , password , address , mobileNo) VALUES (?, ?, ? ,? ,? ,?)";
    bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
        if(err) return res.json({Error: "Error in hashing password"});
        const values = [
            req.body.eid,
            req.body.name,
            req.body.email,
            hash,
            req.body.address,
            req.body.mobileNo,
        ]
        con.query(sql, [values], (err, _result) => {
            if(err) return res.json({Error: "Inside singup query"});
            return res.json({Status: "Success"});
        })
    } )
})

////
// Insert a new engineer
app.post('/api/engineer', (req, res) => {
    const { engineerId, engineerName, email, address, mobileNo } = req.body;
  
    const insertQuery = `INSERT INTO engineer (engineerId, engineerName, email, address, mobileNo) VALUES (?, ?, ?, ?, ?)`;
    const values = [engineerId, engineerName, email, address, mobileNo];
  
    pool.query(insertQuery, values, (error, results) => {
      if (error) {
        console.error('Error inserting engineer:', error);
        res.status(500).json({ error: 'Failed to insert engineer' });
      } else {
        console.log('Engineer added successfully');
        res.sendStatus(200);
      }
    });
  });

  //////REPORT  ------- work in progress
 
// API endpoint for fetching engineer data
app.get('/api/engineers', (req, res) => {
  // Construct the SQL query
  const query = 'SELECT E_id, name FROM engineer';

  // Execute the SQL query
  con.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching engineer data:', err);
      res.status(500).send('Error fetching engineer data');
    } else {
      console.log('Engineer data fetched successfully');
      res.status(200).json(rows);
    }
  });
});

// API endpoint for fetching call master report
app.get('/api/report/:engineerId', (req, res) => {
  // Extract the engineer ID from the request parameters
  const engineerId = req.params.engineerId;

  // Construct the SQL query
  // const query = 'SELECT RMA, P_code, def_qty, used_qty FROM call_master WHERE E_id = ? ';
  const query = 'SELECT cm.RMA, cm.Part_code, cm.def_qty, cm.used_qty, at.Alc_qty FROM call_master cm JOIN engineer_allocation at ON cm.Part_code = at.Part_code WHERE cm.E_id = ?';
  // Construct the SQL query
// const query = 'SELECT cm.RMA, cm.P_code, cm.def_qty, cm.used_qty, at.Alc_qty, at.def_qty AS def_qty FROM call_master cm JOIN engineer_allocation at ON cm.P_code = at.P_code WHERE cm.E_id = ?';

// Execute the SQL query with the engineer ID
con.query(query, [engineerId], (err, rows) => {
  if (err) {
    console.error('Error fetching call master report:', err);
    res.status(500).send('Error fetching call master report');
  } else {
    console.log('Call master report fetched successfully');
    res.status(200).json(rows);
  }
});


  // Execute the SQL query with the engineer ID
  con.query(query, [engineerId], (err, rows) => {
    if (err) {
      console.error('Error fetching call master report:', err);
      res.status(500).send('Error fetching call master report');
    } else {
      console.log('Call master report fetched successfully');
      res.status(200).json(rows);
    }
  });
});
  
  //////////////Add engineer
  // Insert engineer data
app.post('/api/engineers', (req, res) => {
  const { E_id, name, email, password, address, mobileNo } = req.body;

  const sql = 'INSERT INTO engineer (E_id, name, email, password , address, mobileNo) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [E_id, name, email, password, address, mobileNo];

  con.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error inserting engineer data:', error);
      return res.status(500).json({ error: 'Failed to insert engineer data' });
    }

    console.log('Engineer data inserted successfully');
    return res.status(200).json({ message: 'Engineer data inserted successfully' });
  });
});


///////////////Add cco 
app.post('/api/cco/add', (req, res) => {
  const { cco_id, password} = req.body;

  const sql = 'INSERT INTO cco_login (cco_id, password) VALUES (?, ?)';
  const values = [cco_id, password];

  con.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error inserting engineer data:', error);
      return res.status(500).json({ error: 'Failed to insert engineer data' });
    }

    console.log('Engineer data inserted successfully');
    return res.status(200).json({ message: 'Engineer data inserted successfully' });
  });
});


// Update CCO
app.put('/api/cco/:ccoId', (req, res) => {
  const ccoId = req.params.ccoId;
  const { password } = req.body;

  const query = 'UPDATE cco_login SET password = ? WHERE cco_id = ?';
  con.query(query, [password, ccoId], (err) => {
    if (err) {
      console.error('Error updating CCO:', err);
      res.status(500).json({ status: 'Error' });
    } else {
      console.log('CCO updated successfully');
      res.json({ status: 'Success' });
    }
  });
});

// Delete CCO
app.delete('/api/cco/:ccoId', (req, res) => {
  const ccoId = req.params.ccoId;

  const query = 'DELETE FROM cco_login WHERE cco_id = ?';
  con.query(query, [ccoId], (err) => {
    if (err) {
      console.error('Error deleting CCO:', err);
      res.status(500).json({ status: 'Error' });
    } else {
      console.log('CCO deleted successfully');
      res.json({ status: 'Success' });
    }
  });
});

// Fetch CCO Data
app.get('/api/cco', (req, res) => {
  const query = 'SELECT * FROM cco_login';

  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching CCO data:', err);
      res.status(500).json({ status: 'Error' });
    } else {
      console.log('CCO data fetched successfully');
      res.json(results);
    }
  });
});
//////////////////////engineer Main

app.post('/api/insertData', (req, res) => {
  const { RMA, partCodes, usedQtys, date, E_id } = req.body;

  // Perform any necessary validation or data manipulation here

  // Example query to insert data into the call_master table
  const insertQuery = 'INSERT INTO call_master (RMA, Part_code, used_qty, used_date, E_id) VALUES (?, ?, ?, ?, ?)';
  
  // Loop through the partCodes and usedQtys arrays to insert multiple rows
  partCodes.forEach((partCode, index) => {
    const usedQty = usedQtys[index];

    con.query(insertQuery, [RMA, partCode, usedQty, date, E_id], (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        res.json({ status: 'Error' });
        return;
      }

      // Update the allocation table to subtract alc_qty based on E_id and Part_code
      const updateQuery = 'UPDATE engineer_allocation SET Alc_qty = Alc_qty - ? WHERE E_id = ? AND Part_code = ?';
      con.query(updateQuery, [usedQty, E_id, partCode], (err, result) => {
        if (err) {
          console.error('Error updating allocation table:', err);
          return;
        }
        console.log('Allocation table updated successfully');
      });
    });
  });

  console.log('Data inserted successfully');
  res.json({ status: 'Success' });
   // Send a success response with the message
  
});




app.get('/api/EngineerDropDown', async (req, res) => {
  try {
    const selectQuery = `SELECT E_id FROM engineer`;
    db.query(selectQuery, (err, result) => {
      if (err) throw err;
      res.status(200).json(result);
    });
  } catch (error) {
    console.error('Error fetching engineers:', error);
    res.status(500).send('Error fetching engineers');
  }
});


////////////////////////////////Parts


app.post('/data', (req, res) => {
  const { P_Name, Part_code, P_Location, Qty, Model_Code } = req.body;

  const partsQuery = `INSERT INTO parts (P_Name, Part_code, P_Location) VALUES (?, ?, ?)`;
  const partsValues = [P_Name, Part_code, P_Location];

  const stockQuery = `INSERT INTO stock (Part_code, Qty) VALUES (?, ?)`;
  const stockValues = [Part_code, Qty];

  const modelPartQuery = `INSERT INTO model_part (Part_code, Model_Code) VALUES ?`;
  const modelPartValues = Model_Code.map((code) => [Part_code, code]);

  con.query(partsQuery, partsValues, (partsError, partsResult) => {
    if (partsError) {
      console.error('Error inserting data into parts table:', partsError);
      res.status(500).json({ error: 'Failed to insert data into parts table' });
    } else {
      con.query(stockQuery, stockValues, (stockError, stockResult) => {
        if (stockError) {
          console.error('Error inserting data into stock table:', stockError);
          res.status(500).json({ error: 'Failed to insert data into stock table' });
        } else {
          con.query(modelPartQuery, [modelPartValues], (modelPartError, modelPartResult) => {
            if (modelPartError) {
              console.error('Error inserting data into model_part table:', modelPartError);
              res.status(500).json({ error: 'Failed to insert data into model_part table' });
            } else {
              console.log('Data inserted successfully');
              res.status(200).json({ message: 'Data inserted successfully' });
            }
          });
        }
      });
    }
  });
});

app.get('/data', (req, res) => {
  const query = `
      SELECT parts.Part_code, parts.P_Name, parts.P_Location, model_part.Model_Code
      FROM parts
      LEFT JOIN model_part ON parts.Part_code = model_part.Part_code
    `;
  con.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data from the database' });
    } else {
      console.log('Data fetched successfully');
      res.status(200).json(results);
    }
  });
});

app.get('/model-codes', (req, res) => {
  const query = `SELECT Model_Code FROM company_model`;

  con.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching model codes:', error);
      res.status(500).json({ error: 'Failed to fetch model codes from the database' });
    } else {
      console.log('Model codes fetched successfully');
      const modelCodes = results.map((row) => row.Model_Code);
      res.status(200).json(modelCodes);
    }
  });
});

app.put('/data/:partCode', (req, res) => {
  const partCode = req.params.partCode;
  const { P_Name, P_Location } = req.body;

  const query = `UPDATE parts SET P_Name = ?, P_Location = ? WHERE Part_code = ?`;
  const values = [P_Name, P_Location, partCode];

  con.query(query, values, (error, result) => {
    if (error) {
      console.error('Error updating data:', error);
      res.status(500).json({ error: 'Failed to update data in the database' });
    } else {
      console.log('Data updated successfully');
      res.status(200).json({ message: 'Data updated successfully' });
    }
  });
});

app.delete('/data/:partCode', (req, res) => {
  const partCode = req.params.partCode;

  const query = `DELETE FROM parts WHERE Part_code = ?`;
  const values = [partCode];

  con.query(query, values, (error, result) => {
    if (error) {
      console.error('Error deleting data:', error);
      res.status(500).json({ error: 'Failed to delete data from the database' });
    } else {
      console.log('Data deleted successfully');
      res.status(200).json({ message: 'Data deleted successfully' });
    }
  });
});



///////////////Engineer Allocation


app.post('/api/engineer_allocation', (req, res) => {
  const { E_id, Part_code, Alc_qty, Alc_date, def_qty } = req.body;

  // Create a SQL query to insert data into the "engineer_allocation" table
  const insertQuery = 'INSERT INTO engineer_allocation (E_id, Part_code, Alc_qty, Alc_date) VALUES (?, ?, ?, ?)';
  const insertValues = [E_id, Part_code, Alc_qty, Alc_date];

  // Create a SQL query to update the "Qty" column in the "stock" table
  const updateQuery = 'UPDATE stock SET Qty = Qty - ? WHERE Part_code = ?';
  const updateValues = [Alc_qty, Part_code];

  // Execute the SQL queries in a transaction
  con.beginTransaction((error) => {
    if (error) {
      console.error('Error starting transaction:', error);
      res.status(500).json({ error: 'Failed to start transaction' });
      return;
    }

    // Insert data into the "engineer_allocation" table
    con.query(insertQuery, insertValues, (error, result) => {
      if (error) {
        console.error('Error inserting data:', error);
        con.rollback(() => {
          res.status(500).json({ error: 'Failed to insert data into the database' });
        });
      } else {
        // Update the "Qty" column in the "stock" table
        con.query(updateQuery, updateValues, (error, result) => {
          if (error) {
            console.error('Error updating stock quantity:', error);
            con.rollback(() => {
              res.status(500).json({ error: 'Failed to update stock quantity' });
            });
          } else {
            // Commit the transaction
            con.commit((error) => {
              if (error) {
                console.error('Error committing transaction:', error);
                con.rollback(() => {
                  res.status(500).json({ error: 'Failed to commit transaction' });
                });
              } else {
                console.log('Data inserted successfully and stock quantity updated');
                res.status(200).json({ message: 'Data inserted successfully' });
              }
            });
          }
        });
      }
    });
  });
});


app.get('/partCodes', (req, res) => {
  const query = 'SELECT Part_code FROM parts'; // Replace "parts" with the actual table name for Part_code
  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching Part_code data:', err);
      res.status(500).send('Error fetching Part_code data');
      return;
    }
    const Part_code = results.map((row) => row.Part_code);
    res.json(Part_code);
    console.log(Part_code);
  });
});

// API endpoint to fetch data from the "engineer_allocation" table
app.get('/api/engineer_allocation', (req, res) => {
  // Create a SQL query to fetch all data from the "engineer_allocation" table
  const query = 'SELECT * FROM engineer_allocation';

  // Execute the SQL query
  con.query(query, (error, result) => {
    if (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data from the database' });
    } else {
      console.log('Data fetched successfully');
      res.status(200).json(result);
    }
  });
});


// API endpoint to update data in the "engineer_allocation" table
app.put('/api/engineer_allocation/:id', (req, res) => {
  const sno = req.params.id;
  const { def_qty } = req.body;

  // Create a SQL query to update data in the "engineer_allocation" table
  const query = 'UPDATE engineer_allocation SET def_qty = ? WHERE sno = ?';
  const values = [def_qty, sno];

  // Execute the SQL query
  con.query(query, values, (error, result) => {
    if (error) {
      console.error('Error updating data:', error);
      res.status(500).json({ error: 'Failed to update data in the database' });
    } else {
      console.log('Data updated successfully');
      res.status(200).json({ message: 'Data updated successfully' });
    }
  });
});
app.put('/api/engineer_allocation-Alc/:id', (req, res) => {
  const sno = req.params.id;
  const { Alc_qty } = req.body;

  // Create a SQL query to update data in the "engineer_allocation" table
  const updateAllocationQuery = 'UPDATE engineer_allocation SET Alc_qty = Alc_qty - ? WHERE sno = ?';
  const updateAllocationValues = [Alc_qty, sno];

  // Create a SQL query to fetch the Part_code and current Alc_qty from the "engineer_allocation" table
  const fetchAllocationQuery = 'SELECT Part_code, Alc_qty FROM engineer_allocation WHERE sno = ?';
  con.query(fetchAllocationQuery, [sno], (error, allocationResult) => {
    if (error) {
      console.error('Error fetching allocation data:', error);
      res.status(500).json({ error: 'Failed to fetch allocation data from the database' });
    } else {
      const { Part_code, Alc_qty } = allocationResult[0];
      const newStockQty = Alc_qty + Alc_qty; // Calculate the new stock quantity

      // Create a SQL query to update the "Qty" column in the "stock" table
      const updateStockQuery = 'UPDATE stock SET Qty = Qty + ? WHERE Part_code = ?';
      const updateStockValues = [Alc_qty, Part_code];

      // Execute the SQL queries in a transaction
      con.beginTransaction((error) => {
        if (error) {
          console.error('Error starting transaction:', error);
          res.status(500).json({ error: 'Failed to start transaction' });
          return;
        }

        // Update data in the "engineer_allocation" table
        con.query(updateAllocationQuery, updateAllocationValues, (error, allocationResult) => {
          if (error) {
            console.error('Error updating data in engineer_allocation:', error);
            con.rollback(() => {
              res.status(500).json({ error: 'Failed to update data in engineer_allocation' });
            });
          } else {
            // Update the "Qty" column in the "stock" table
            con.query(updateStockQuery, updateStockValues, (error, stockResult) => {
              if (error) {
                console.error('Error updating stock quantity:', error);
                con.rollback(() => {
                  res.status(500).json({ error: 'Failed to update stock quantity' });
                });
              } else {
                // Commit the transaction
                con.commit((error) => {
                  if (error) {
                    console.error('Error committing transaction:', error);
                    con.rollback(() => {
                      res.status(500).json({ error: 'Failed to commit transaction' });
                    });
                  } else {
                    console.log('Data updated successfully and stock quantity updated');
                    res.status(200).json({ message: 'Data updated successfully' });
                  }
                });
              }
            });
          }
        });
      });
    }
  });
});

////////////////////////////def_qty

// Insert API
app.post('/updatedef', (req, res) => {
  const { RMA, Part_code, E_id, def_qty, def_date } = req.body;
  console.log('Received Data:', RMA, Part_code, E_id, def_qty, def_date);

  // First, fetch Alc_qty from the engineer_allocation table
  const fetchAlcQtySql = 'SELECT Alc_qty FROM engineer_allocation WHERE Part_code = ? AND E_id = ?';
  const fetchAlcQtyValues = [Part_code, E_id];

  con.query(fetchAlcQtySql, fetchAlcQtyValues, (err, result) => {
    if (err) {
      console.error('Error fetching Alc_qty:', err);
      res.status(500).json({ message: 'Error fetching Alc_qty' });
      return;
    }

    // Check if Alc_qty is less than def_qty
    const Alc_qty = result[0] ? result[0].Alc_qty : 0; // Assuming Alc_qty is numeric, otherwise adjust accordingly

    if (def_qty > Alc_qty) {
      res.status(400).json({ message: 'Unable to update data. def_qty is greater than Alc_qty.' });
      return;
    }

    // Perform the update if def_qty is less than or equal to Alc_qty
    const sql = 'UPDATE call_master SET def_qty = ?, def_date = ? WHERE RMA = ? AND Part_code = ? AND E_id = ?';
    const values = [def_qty, def_date, RMA, Part_code, E_id];

    con.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating data:', err);
        res.status(500).json({ message: 'Error updating data' });
      } else {
        if (result.affectedRows === 0) {
          res.status(400).json({ message: 'Data not updated. The provided RMA, Part_code, and E_id do not match any records.' });
        } else {
          console.log('Data updated successfully:', result);
          res.status(200).json({ message: 'Data updated successfully' });
        }
      }
    });
  });
});

// Backend API to fetch data from the database
app.get('/fetch', (req, res) => {
  const fetchSql =
    'SELECT RMA, Part_code, def_qty, used_qty, def_date, E_id, (def_qty - used_qty) AS discr FROM call_master';
  con.query(fetchSql, (err, result) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ message: 'Error fetching data' });
    } else {
      console.log('Data fetched successfully:', result);
      res.status(200).json(result);
    }
  });
});



// company_model
// API endpoint for inserting data
app.post('/companymodel', (req, res) => {
  const { companyName, modelCode } = req.body;

  // Check if the model code already exists in the database
  const checkQuery = 'SELECT model_code FROM company_model WHERE model_code = ?';
  con.query(checkQuery, [modelCode], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking data:', checkErr);
      res.status(500).send('Error checking data');
      return;
    }

    if (checkResults.length > 0) {
      // If the model code exists, perform an update
      const updateQuery = 'UPDATE company_model SET Company_name = ? WHERE model_code = ?';
      con.query(updateQuery, [companyName, modelCode], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating data:', updateErr);
          res.status(500).send('Error updating data');
          return;
        }
        console.log('Data updated successfully');
        res.send('Data updated successfully');
      });
    } else {
      // If the model code does not exist, perform an insertion
      const insertQuery = 'INSERT INTO company_model (Company_name, model_code) VALUES (?, ?)';
      con.query(insertQuery, [companyName, modelCode], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('Error inserting data:', insertErr);
          res.status(500).send('Error inserting data');
          return;
        }
        console.log('Data inserted successfully');
        res.send('Data inserted successfully');
      });
    }
  });
});


// API endpoint for fetching data
app.get('/CompanyData', (req, res) => {
  // Select all data from the company_model table
  const query = 'SELECT id, model_code, Company_name FROM company_model';
  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.json(results);
  });
});
// ...

// API endpoint for updating data
app.put('/CompanyUpdate/:id', (req, res) => {
  const id = req.params.id;
  const { companyName, modelCode } = req.body;
  console.log('Received data:',id, companyName, modelCode); 

  // Update data in the MySQL table
  const query = 'UPDATE company_model SET company_name = ?, model_code = ? WHERE id = ?';
  con.query(query, [companyName, modelCode, id], (err, result) => {
    if (err) {
      console.error('Error updating data:', err);
      res.status(500).send('Error updating data');
      return;
    }
    console.log('Data updated successfully');
    res.send('Data updated successfully');
  });
});

// API endpoint for deleting data
app.delete('/CompanyDelete/:id', (req, res) => {
  const id = req.params.id;

  // Delete data from the MySQL table
  const query = 'DELETE FROM company_model WHERE id = ?';
  con.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      res.status(500).send('Error deleting data');
      return;
    }
    console.log('Data deleted successfully');
    res.send('Data deleted successfully');
  });
});


/////////////////////////////////////STOCK

// API endpoint for fetching the data
app.get('/api/Stock', (req, res) => {
  const queryParts = 'SELECT Part_code, P_Name, P_Location FROM parts';
  const queryCompanyModel = 'SELECT model_code FROM company_model ';
  const queryStock = 'SELECT Qty FROM stock';

  con.query(queryCompanyModel, (err, rowsCompanyModel) => {
    if (err) {
      console.error('Error fetching company_model data:', err);
      res.status(500).send('Error fetching company_model data');
    } else {
      con.query(queryParts, (err, rowsParts) => {
        if (err) {
          console.error('Error fetching parts data:', err);
          res.status(500).send('Error fetching parts data');
        } else {
          con.query(queryStock, (err, rowsStock) => {
            if (err) {
              console.error('Error fetching stock data:', err);
              res.status(500).send('Error fetching stock data');
            } else {
              const data = {
                companyModel: rowsCompanyModel,
                parts: rowsParts,
                stock: rowsStock
              };
              res.status(200).json(data);
            }
          });
        }
      });
    }
  });
});

////////////////////////////PURCHASE ENTRY



// Create an invoice
app.post('/api/invoiceAdd', (req, res) => {
  const { inv_id, Part_code, date, Qty } = req.body;

  const invoiceQuery = 'INSERT INTO invoice (inv_id, date, Part_code, Qty) VALUES (?, ?, ?, ?)';
  const invoiceValues = [inv_id, date, Part_code, Qty];

  const quantityQuery = 'UPDATE Stock SET Qty = Qty + ? WHERE Part_code = ?';
  const quantityValues = [Qty, Part_code];

  con.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      res.status(500).send('Error starting transaction');
      return;
    }

    con.query(invoiceQuery, invoiceValues, (err, invoiceResult) => {
      if (err) {
        console.error('Error inserting invoice:', err);
        con.rollback(() => {
          res.status(500).send('Error inserting invoice');
        });
      } else {
        con.query(quantityQuery, quantityValues, (err, quantityResult) => {
          if (err) {
            console.error('Error updating quantity:', err);
            con.rollback(() => {
              res.status(500).send('Error updating quantity');
            });
          } else {
            con.commit((err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                con.rollback(() => {
                  res.status(500).send('Error committing transaction');
                });
              } else {
                console.log('Invoice and quantity updated successfully');
                res.sendStatus(200);
              }
            });
          }
        });
      }
    });
  });
});
app.put('/api/Updateinvoice/:id', (req, res) => {
  const invoiceId = req.params.id;
  const { inv_id, date, Part_code, Qty } = req.body;

  const updateQuery = 'UPDATE invoice SET inv_id=?, date=?, Part_code=?, Qty=? WHERE id=?';

  con.query(updateQuery, [inv_id, date, Part_code, Qty, invoiceId], (err, result) => {
    if (err) {
      console.error('Error updating invoice:', err);
      res.status(500).send('Error updating invoice');
    } else {
      res.status(200).send('Invoice updated successfully');
    }
  });
});

app.delete('/api/invoice/:id', (req, res) => {
  const invoiceId = req.params.id;

  const deleteQuery = 'DELETE FROM invoice WHERE id=?';

  con.query(deleteQuery, [invoiceId], (err, result) => {
    if (err) {
      console.error('Error deleting invoice:', err);
      res.status(500).send('Error deleting invoice');
    } else {
      res.status(200).send('Invoice deleted successfully');
    }
  });
});

app.get('/partCodes', (req, res) => {
  const query = 'SELECT Part_code FROM parts'; 
  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching Part_code data:', err);
      res.status(500).send('Error fetching Part_code data');
      return;
    }
    const partCodes = results.map((row) => row.Part_code);
    res.json(partCodes);
  });
});


// Get all invoices
app.get('/api/invoices', (req, res) => {
  const query = 'SELECT * FROM invoice';

  con.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err);
      res.status(500).send('Error fetching invoices');
      return;
    }
    res.status(200).json(rows);
  });
});






app.listen(8081, ()=> {
    console.log("Running 8081");
})
