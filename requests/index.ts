import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import * as jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'
import * as mongodb from 'mongodb'

let client: mongodb.MongoClient = null

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest,
): Promise<void> => {
  dotenv.config()

  context.log('HTTP trigger function processed a request.')

  // Check if there is a body attached to the request
  if (!req.body) {
    context.res = {
      status: 400,
      body: 'The request body is empty',
    }
    return
  }

  // Check if a token is provided
  if (!req.body.token) {
    context.res = {
      status: 401,
      body: 'No token provided',
    }
    return
  }

  // Authenticate using jwt
  try {
    jwt.verify(req.body.token, process.env.JWT_KEY)
  } catch (err) {
    context.res = {
      status: 401,
      body: 'Could not authenticate token',
    }
    return
  }

  const phoneNumber = req.body.phone

  // Check if phone number is not empty or not a string
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    context.res = {
      status: 400,
      body: 'The phone number is empty',
    }
    return
  }

  const firstTwo = phoneNumber.substring(0, 2)
  let firstFour = phoneNumber.substring(0, 4)

  // Check if the number is a german number
  if (firstTwo === '00' && firstFour !== '0049') {
    context.res = {
      status: 400,
      body: 'Not a german number',
    }
    return
  } else if (firstFour === '0049') {
    firstFour = '0' + phoneNumber.substring(4, 7)
  }

  // Check for expensive numbers
  switch (firstFour) {
    case '0137':
    case '0700':
    case '0900':
    case '0180':
    case '0190':
    case '1180':
      context.res = {
        status: 400,
        body: 'This phone number is not allowed',
      }
      return
  }

  const zip = req.body.zip
  const request = req.body.request

  // Check if zip code and request exist
  if (!zip || !request) {
    context.res = {
      status: 400,
      body: 'Zip code or request is missing',
    }
    return
  }

  // Check if the zip code is a five number construct
  if (isNaN(zip) || !(zip + '').length || (zip + '').length !== 5) {
    context.res = {
      status: 400,
      body: 'Not a valid zip code',
    }
    return
  }

  // Check if the request code is a number between -1 and 9
  if (isNaN(request) || request < -1 || request > 9) {
    context.res = {
      status: 400,
      body: 'Not a valid request code',
    }
    return
  }

  if (client == null) {
    try {
      client = await mongodb.MongoClient.connect(process.env.DB)
    } catch (err) {
      context.res = {
        status: 500,
        body: 'Something went wrong',
      }
      return
    }
  }

  try {
    await client.db('coronadb').collection('requests').insertOne({
      timestamp: Date.now(),
      phone: phoneNumber,
      zip: zip,
      request: request,
    })
  } catch (err) {
    context.res = {
      status: 500,
      body: 'Something went wrong',
    }
    return
  }

  context.res = {
    status: 200,
    body: 'Success',
  }
}

export default httpTrigger
