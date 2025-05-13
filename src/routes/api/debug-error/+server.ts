import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const errorType = url.searchParams.get('type') || 'default';
  const statusCode = parseInt(url.searchParams.get('code') || '404', 10);
  
  console.log(`[Debug Error] Throwing ${statusCode} error of type: ${errorType}`);
  
  switch (errorType) {
    case 'throw':
      throw new Error('This is a direct thrown error');
      
    case 'response':
      return new Response('Error from Response', { status: statusCode });
      
    case 'object':
      throw error(statusCode, { message: 'Error with object message' });
      
    case 'string':
      throw error(statusCode, 'Error with string message');
      
    case 'default':
    default:
      throw error(statusCode);
  }
}; 