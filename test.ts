import { linkupSearch } from './src/index';

async function test() {
  console.log('Testing Linkup search...\n');
  
  const result = await linkupSearch({
    query: 'What is the capital of France?',
    depth: 'standard'
  });
  
  console.log('✅ Success!');
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);