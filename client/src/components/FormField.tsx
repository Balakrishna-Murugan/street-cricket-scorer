import React from 'react';
import { TextField } from '@mui/material';

interface FormFieldProps {
  label: string;
  value: any;
  onChange: (e: any) => void;
  type?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  inputProps?: any;
}

const FormField: React.FC<FormFieldProps> = ({ label, value, onChange, type = 'text', required = false, error = false, helperText = '', inputProps }) => {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      fullWidth
      required={required}
      error={error}
      helperText={helperText}
      inputProps={inputProps}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          '&:hover fieldset': {
            borderColor: (theme: any) => theme.palette.primary.main,
          },
        },
      }}
    />
  );
};

export default FormField;
