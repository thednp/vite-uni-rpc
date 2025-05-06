import van from "vanjs-core";
import { reactive } from "vanjs-ext";

interface ActionOptions<T, U> {
  name?: string;
  onComplete?: (submission: ActionSubmission<T, U>) => void;
}

interface ActionSubmission<T, U> {
  input: T;
  result?: U;
  error?: Error;
  pending: boolean;
  clear: () => void;
  retry: () => Promise<U>;
}

type ActionState<T, U> = {
  submissions: ActionSubmission<T, U>[];
}

export function createAction<T, U = void>(
    fn: (input: T) => Promise<U>,
    options: ActionOptions<T, U> = {}
  ) {
    // Create reactive state for submissions
    const state = reactive<ActionState<T, U>>({
      submissions: []
    });
  
    // Create the action function
    async function actionFn(input: T): Promise<U> {
      // First create submission and promise handlers
      let submission: ActionSubmission<T, U>;
      let promiseHandlers = { 
        resolve: undefined as ((value: U | PromiseLike<U>) => void) | undefined,
        reject: undefined as ((reason?: any) => void) | undefined,
      };
      
      // Create promise with properly typed handlers
      const resultPromise = new Promise<U>((resolve, reject) => {
        promiseHandlers = { resolve, reject };
      });
  
      // Create submission object
      submission = {
        input,
        pending: true,
        clear: () => {
          state.submissions = state.submissions.filter(s => s !== submission);
        },
        retry: async () => {
          submission.pending = true;
          submission.error = undefined;
          submission.result = undefined;
          
          try {
            const result = await fn(input);
            submission.result = result;
            return result;
          } catch (error) {
            submission.error = error as Error;
            throw error;
          } finally {
            submission.pending = false;
          }
        }
      };
  
      // Add submission to state
      state.submissions = [...state.submissions, submission];
  
      try {
        // Execute the action
        const result = await fn(input);
        
        // Update submission
        submission.result = result;
        submission.pending = false;
        
        // Call onComplete callback
        options.onComplete?.(submission);
        
        promiseHandlers.resolve?.(result);
        return result;
      } catch (error) {
        // Handle error
        submission.error = error as Error;
        submission.pending = false;
        
        // Call onComplete callback
        options.onComplete?.(submission);
        
        promiseHandlers.reject?.(error);
        throw error;
      }
    }
  
    // Rest of the implementation...
    // Attach helper methods and properties
    const action = Object.assign(actionFn, {
      // Get latest submission
      get latest(): ActionSubmission<T, U> | undefined {
        return state.submissions[state.submissions.length - 1];
      },
      // Check if any submission is pending
      get pending(): boolean {
        return state.submissions.some(s => s.pending);
      },
      // Get all submissions
      get submissions(): ActionSubmission<T, U>[] {
        return state.submissions;
      },
      // Clear all submissions
      reset: () => {
        state.submissions = [];
      }
    });
  
    return action;
}

// Usage example with a form:
interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
  }
}

const loginAction = createAction<LoginForm, LoginResponse>(
  async (input) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },
  {
    name: 'login',
    onComplete: (submission) => {
      if (submission.result) {
        // Handle successful login
        localStorage.setItem('token', submission.result.token);
      }
    }
  }
);

// Example component using the action:
const LoginForm = () => {
    const { div, form, input, button } = van.tags;
  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const result = await loginAction({
        email: formData.get('email') as string,
        password: formData.get('password') as string
      });
      
      console.log('Login successful:', result);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return div(
    form(
      { onsubmit: handleSubmit },
      input({ name: 'email', type: 'email', required: true }),
      input({ name: 'password', type: 'password', required: true }),
      button(
        { 
          type: 'submit',
          disabled: () => loginAction.pending 
        },
        () => loginAction.pending ? 'Logging in...' : 'Login'
      )
    ),
    // Show error if exists
    () => loginAction.latest?.error && 
      div({ style: 'color: red' }, loginAction.latest.error.message)
  );
};