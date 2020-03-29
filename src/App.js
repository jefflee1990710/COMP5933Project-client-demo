import React from 'react';
import logo from './logo.svg';
import './App.css';
import BigNumber from "bignumber.js"
import Axios from 'axios'
import {
  schnorrGroupSetting, 
  bankSetting,
  getRandomNumber,
  generateDVP,
  verifyDVP,
  hashMessage,
  signature,
  generateDVS,
  verifyDVS
} from './prime'

import { withStyles } from '@material-ui/core/styles';
import { Grid, Paper, TextField, Typography, Divider, Button, Tab, TableContainer, TableBody, TableRow, TableCell, Table } from '@material-ui/core';

import crypto from 'crypto' 

const styles = (theme) => {
  return {
    root: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(2),
      color: theme.palette.text.secondary,
    },
    textfield : {
      marginTop : 10
    }
  }
}

class App extends React.Component {

  state = {
    p : schnorrGroupSetting.p,
    q : schnorrGroupSetting.q,
    g : schnorrGroupSetting.g,

    bankPubKey : bankSetting.pubKey,

    name : "Chan Tai Man",
    hkid : "D1939588(D)",
    birthday : "1991/05/03",

    registerRequestBody : {
      H1 : "",
      C1 : "",
      H2 : "",
      C2 : "",
      H3 : "",
      C3 : ""
    },
    registerResponseBody : {},

    userPubKey : "",
    userPriKey : "",

    verificationRequestBody : {},
    verificationResponseBody : {},
    dvsPercentage : "0%",
    summaryTimePass : "",
    summaryDVSLength : ""
  }

  sha512(msg){
    const hash = crypto.createHash('sha256');
    hash.update(msg)
    return hash.digest('hex')
  }

  commit(message){
    let buffer = new Buffer(message)
    Buffer.prototype.toByteArray = function () {
        return Array.prototype.slice.call(this, 0)
    }
    let r = []
    for(let byte of buffer.toByteArray()){
      let c = this.state.g.pow(new BigNumber(byte)).modulo(this.state.p)
      c = c.toString(16)
      r.push(c)
    }
    return r.join(',')
  }

  createRegisterRequestBody(){
    this.setState({
      registerRequestBody : {
        H1 : this.sha512(this.state.name),
        C1 : this.commit(this.state.name),
        H2 : this.sha512(this.state.hkid),
        C2 : this.commit(this.state.hkid),
        H3 : this.sha512(this.state.birthday),
        C3 : this.commit(this.state.birthday)
      }
    })
  }

   sendRegisterRequestToNotary(){
    Axios.post('http://localhost:4000/register', this.state.registerRequestBody).then((r) => {
      this.setState({
        registerResponseBody : r.data,
        userPriKey : BigNumber(r.data.userKp.priKey),
        userPubKey : BigNumber(r.data.userKp.pubKey)
      })
    })
  }

  createVerificationRequestBody(){
    let DVSJson = this.generateDVS(this.state.userPriKey, this.state.bankPubKey, `${this.state.registerRequestBody.H1}${this.state.registerRequestBody.H2}${this.state.registerRequestBody.H3}`)
    this.setState({
      verificationRequestBody : {
        pubKey : this.state.userPubKey,
        H1 : this.state.registerRequestBody.H1,
        H2 : this.state.registerRequestBody.H2,
        H3 : this.state.registerRequestBody.H3,
        S : JSON.stringify(DVSJson)
      }
    })
  }

  sendVerificationRequestToBank(){
    Axios.post('http://localhost:4001/verify', this.state.verificationRequestBody).then((r) => {
      console.log(r)
      this.setState({
        verificationResponseBody : r.data
      })
    })
  }

  hashq = (c, G, M) => {
    let sum = c.times(G).times(M)
    return sum.modulo(this.state.q)
  }

  generateDVS = (userPriKey, bankPubKey, message) => {
    // message = "Lee Chi Hang"
    console.log('Message to generate DVS : ', message)
    let {DVS, summary} = generateDVS(userPriKey, bankPubKey, message, (i, l) => {
      this.setState({
        dvsPercentage : `${(i/l)*100}%`
      })
    })
    this.setState({
      summaryTimePass : `Processed ${summary.time}ms`,
      summaryDVSLength : `Divided into ${summary.length} parts`
    })
    console.log('DVS Generated')
    return DVS
  }

  render(){
    const classes = this.props.classes
    return (
      <main className={classes.root}>
        {/* Step 0 - Setup */}
        <Grid container spacing={1}>
          <Grid item xs><h1>Step 0 - Setup</h1></Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <TextField className={classes.textfield} variant='outlined' label='p' fullWidth value={this.state.p}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='q' fullWidth value={this.state.q}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='g' fullWidth value={this.state.g}></TextField>
            </Paper>
          </Grid>
        </Grid>

        {/* Step 1 - Registration */}
        <Grid container spacing={1}>
          <Grid item xs={12}><h1>Step 1 - Registration</h1></Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>Request</Typography>
              <Divider />
              <TextField className={classes.textfield} variant='outlined' label='Name' fullWidth value={this.state.name}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='HKID' fullWidth value={this.state.hkid}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='Birthday' fullWidth value={this.state.birthday}></TextField>
              <Button className={classes.textfield} variant='outlined' fullWidth onClick={this.createRegisterRequestBody.bind(this)}>Create Request ></Button>
              <TextField className={classes.textfield} variant='outlined' label='Request Body' multiline fullWidth rows="8" value={JSON.stringify(this.state.registerRequestBody, null, 2)}></TextField>
              <Button className={classes.textfield} variant='outlined' fullWidth onClick={this.sendRegisterRequestToNotary.bind(this)}>Send to Notary for Registration ></Button>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>Response</Typography>
              <Divider />
              <TextField className={classes.textfield} variant='outlined' label='Response Body' multiline fullWidth rows="8" value={JSON.stringify(this.state.registerResponseBody, null, 2)}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='User Public Key' fullWidth value={this.state.userPubKey}></TextField>
              <TextField className={classes.textfield} variant='outlined' label='User Private Key' fullWidth value={this.state.userPriKey}></TextField>
            </Paper>
          </Grid>
        </Grid>

        {/* Step 2 - Verification with Bank */}
        <Grid container spacing={1}>
          <Grid item xs={12}><h1>Step 2 - Verification Process</h1></Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>Request</Typography>
              <Divider />
              <Button className={classes.textfield} variant='outlined' fullWidth onClick={this.createVerificationRequestBody.bind(this)}>Create Request and Designated Verifier Signature ({this.state.dvsPercentage}) ></Button>
              <Typography variant='h6'>Designated Verifier Signature Summary</Typography>
              <Divider />
              <TableContainer component={Paper}>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell variant='head'>Message:</TableCell>
                      <TableCell style={{wordBreak : 'break-all'}}>{`${this.state.registerRequestBody.H1}${this.state.registerRequestBody.H2}${this.state.registerRequestBody.H3}`}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant='head'>Time required:</TableCell>
                      <TableCell>{`${this.state.summaryTimePass}`}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant='head'>Partation:</TableCell>
                      <TableCell>{`${this.state.summaryDVSLength}`}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <TextField className={classes.textfield} variant='outlined' label='Request Body' multiline fullWidth rows="8" value={JSON.stringify(this.state.verificationRequestBody, null, 2)}></TextField>
              <Button className={classes.textfield} variant='outlined' fullWidth onClick={this.sendVerificationRequestToBank.bind(this)}>Send to Bank for Verification ></Button>
            
            </Paper>
            
          </Grid>
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>Response</Typography>
              <Divider />
              <TextField className={classes.textfield} variant='outlined' label='Response Body' multiline fullWidth rows="8" value={JSON.stringify(this.state.verificationResponseBody, null, 2)}></TextField>
            </Paper>
          </Grid>
        </Grid>

      </main>
    )
  }
}

export default withStyles(styles)(App);
