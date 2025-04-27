/**
 * Lambda function to create a new user in AWS Cognito
 * This function creates a user in Cognito with a temporary password,
 * and returns the Cognito user ID (sub) for further operations.
 */
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { randomBytes } from "crypto";

// Initialize the Cognito client
const cognito = new CognitoIdentityProviderClient({});

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const DEFAULT_PASSWORD_LENGTH = 8;

// CORS headers
// const headers = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "OPTIONS,POST",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

/**
 * Generates a secure temporary password
 * @param {number} length - Length of the password to generate
 * @returns {string} - Generated temporary password
 */
function generateTemporaryPassword(length = DEFAULT_PASSWORD_LENGTH) {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numericChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+';
  
  // Ensure password meets Cognito requirements by including at least one of each character type
  let password = '';
  
  // Add one character from each required type
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numericChars.charAt(Math.floor(Math.random() * numericChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest of the password with random characters
  const allChars = uppercaseChars + lowercaseChars + numericChars + specialChars;
  const remainingLength = length - 4;
  
  const randomBytesBuffer = randomBytes(remainingLength);
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomBytesBuffer[i] % allChars.length;
    password += allChars.charAt(randomIndex);
  }
  
  // Shuffle the password to avoid predictable pattern
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Creates a new user in Cognito user pool
 * @param {string} email - User's email address
 * @param {string} [temporaryPassword] - Optional temporary password, will generate one if not provided
 * @returns {Promise<Object>} - Returns object with user details including sub (user ID)
 */
async function createCognitoUser(email, temporaryPassword) {
  if (!email) {
    throw new Error("Email is required");
  }
  
  if (!temporaryPassword) {
    temporaryPassword = generateTemporaryPassword();
  }
  
  try {
    // Create the user in Cognito
    const createUserResponse = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        TemporaryPassword: temporaryPassword,
        // MessageAction: "SUPPRESS" has been removed to allow Cognito to send welcome email
        UserAttributes: [
          {
            Name: "email",
            Value: email
          },
          {
            Name: "email_verified",
            Value: "true"
          }
        ]
      })
    );
    
    // Get the user object from the response
    const user = createUserResponse.User;
    
    // Find the sub attribute (Cognito user ID)
    const subAttribute = user.Attributes.find(attr => attr.Name === "sub");
    const userId = subAttribute ? subAttribute.Value : null;
    
    return {
      userId,
      email,
      temporaryPassword,
      userCreated: true
    };
  } catch (error) {
    console.error("Error creating Cognito user:", error);
    throw error;
  }
}

export const handler = async (event) => {
  try {
    
    // Extract email from the request
    const {email} = event;
    
    // Validate email
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing email', 
          details: 'Email address is required' 
        })
      };
    }
    
    // Create the user in Cognito
    const result = await createCognitoUser(email);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'User created successfully in Cognito',
        user: {
          userId: result.userId,
          email: result.email,
          temporaryPassword: result.temporaryPassword
        }
      })
    };
    
  } catch (error) {
    console.error('Error creating Cognito user:', error);
    
    // Handle specific Cognito errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.name === 'UsernameExistsException') {
      statusCode = 409;
      errorMessage = 'User with this email already exists';
    } else if (error.name === 'InvalidParameterException') {
      statusCode = 400;
      errorMessage = 'Invalid parameters provided';
    }
    
    return {
      statusCode,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message
      })
    };
  }
};