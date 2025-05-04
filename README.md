# Stderr Summary

Automatic summary and bullet-point fixes for development error logs.

## Purpose

`stderr-summary` monitors your development server’s error logs in real time. When an error is detected, it automatically uses an LLM to summarize the error and provides bullet-point recommendations to help you resolve it.

## Install

`npm install stderr-summary`

or 

`yarn add stderr-summary`

## Usage

Update your `package.json` "dev" script, with your current command in `--cmd`

```
 "scripts": {
    "dev": "stderr-summary --cmd='next dev'",
    ...
  }
```

Alternatively, you can run on the command line:

```
npx stderr-summary --cmd="npm run dev"
```
or
```
yarn stderr-summary --cmd="yarn run dev"
```

- `--cmd` (required): The development command to run (e.g., `"next dev"`).
- `--log` (optional): Path to the log file. Defaults to `.bug-summary-helper/dev.log`.
- `--model` (optional): OpenAI model. Default is `4o`

## Environment Variables

Assure that your a `.env` file at the root of the project and add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
```

## Example Output

When an error occurs, it will be followed by an error description and recommended fix steps. Something like this:

```bash
[Error], TypeError: Cannot read properties of undefined (reading 'map')

[Fix]
- Check if the variable is defined before accessing its properties.
- Use optional chaining to avoid runtime errors.
```

