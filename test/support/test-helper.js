const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const chaiHttp = require('chai-http')

chai.use(chaiAsPromised)
chai.use(dirtyChai)
chai.use(chaiHttp)
