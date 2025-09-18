import { describe, it, expect } from 'vitest'
import { 
  parseCsv, 
  isValidEmail, 
  ValidationStatus,
  ERROR_FIRST_NAME_REQUIRED,
  ERROR_LAST_NAME_REQUIRED,
  ERROR_EMAIL_REQUIRED,
  ERROR_INVALID_EMAIL_FORMAT,
  WARNING_INVALID_COUNTRY_CODE
} from './csvParser'

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('first.last+tag@example.org')).toBe(true)
    expect(isValidEmail('123@456.com')).toBe(true)
  })

  it('should return false for invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test.example.com')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('test@example')).toBe(false)
  })
})

describe('parseCsv', () => {
  it('should throw error for empty content', () => {
    expect(() => parseCsv('')).toThrow('CSV content cannot be empty')
    expect(() => parseCsv('   ')).toThrow('CSV content cannot be empty')
  })

  it('should throw error for CSV with only headers', () => {
    const csv = 'firstName,lastName,email'
    expect(() => parseCsv(csv)).toThrow('CSV file appears to be empty or contains no valid data')
  })

  it('should throw error for malformed CSV content', () => {
    const malformedCsv = `firstName,lastName,email
"John,Doe,john@example.com,extra"field`
    expect(() => parseCsv(malformedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with mismatched field count', () => {
    const mismatchedCsv = `firstName,lastName,email
John,Doe,john@example.com,ExtraField,AnotherExtra
Jane,Smith`
    expect(() => parseCsv(mismatchedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with critical delimiter issues', () => {
    const noDelimiterCsv = `firstName lastName email
John Doe john@example.com`
    expect(() => parseCsv(noDelimiterCsv)).toThrow()
  })

  it('should parse valid CSV with all required fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode,companyName
John,Doe,john.doe@example.com,Developer,US,Tech Corp`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      jobTitle: 'Developer',
      countryCode: 'US',
      companyName: 'Tech Corp',
      validationStatus: ValidationStatus.Valid,
      errors: [],
      warnings: [],
      rowIndex: 2,
    })
  })

  it('should handle missing required fields and mark as invalid', () => {
    const csv = `firstName,lastName,email
,Smith,john@example.com
John,,john@example.com
John,Smith,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)

    expect(result[0].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[0].errors).toContain(ERROR_FIRST_NAME_REQUIRED)

    expect(result[1].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[1].errors).toContain(ERROR_LAST_NAME_REQUIRED)

    expect(result[2].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[2].errors).toContain(ERROR_EMAIL_REQUIRED)
  })

  it('should validate email format', () => {
    const csv = `firstName,lastName,email
John,Doe,invalid-email
Jane,Smith,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    expect(result[0].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[0].errors).toContain(ERROR_INVALID_EMAIL_FORMAT)
    expect(result[1].validationStatus).toBe(ValidationStatus.Valid)
  })

  it('should handle CSV with quoted values', () => {
    const csv = `firstName,lastName,email,jobTitle
"John","Doe","john.doe@example.com","Software Engineer"`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john.doe@example.com')
    expect(result[0].jobTitle).toBe('Software Engineer')
  })

  it('should skip empty rows', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,,
Jane,Smith,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    expect(result[0].firstName).toBe('John')
    expect(result[1].firstName).toBe('Jane')
  })

  it('should handle case-insensitive headers', () => {
    const csv = `FIRSTNAME,LASTNAME,EMAIL,JOBTITLE,COUNTRYCODE,COMPANYNAME
John,Doe,john@example.com,Developer,US,Tech Corp`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].jobTitle).toBe('Developer')
  })

  it('should handle missing optional fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode
John,Doe,john@example.com,,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].jobTitle).toBeUndefined()
    expect(result[0].countryCode).toBeUndefined()
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
  })

  it('should preserve row index correctly', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
Bob,Johnson,bob@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    expect(result[0].rowIndex).toBe(2)
    expect(result[1].rowIndex).toBe(3)
    expect(result[2].rowIndex).toBe(4)
  })

  it('should handle multiple validation errors per lead', () => {
    const csv = `firstName,lastName,email
 , ,invalid-email`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[0].errors).toHaveLength(3)
    expect(result[0].errors).toContain(ERROR_FIRST_NAME_REQUIRED)
    expect(result[0].errors).toContain(ERROR_LAST_NAME_REQUIRED)
    expect(result[0].errors).toContain(ERROR_INVALID_EMAIL_FORMAT)
  })

  it('should handle extra columns not in header mapping', () => {
    const csv = `firstName,lastName,email,unknownColumn
John,Doe,john@example.com,someValue`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
  })

  it('should handle mixed valid and invalid leads', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,Smith,invalid-email
Jane,Johnson,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[1].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[1].errors).toContain(ERROR_FIRST_NAME_REQUIRED)
    expect(result[1].errors).toContain(ERROR_INVALID_EMAIL_FORMAT)
    expect(result[2].validationStatus).toBe(ValidationStatus.Valid)
  })

  it('should handle whitespace in fields', () => {
    const csv = `firstName,lastName,email
 John , Doe , john@example.com `

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
  })

  it('should validate country codes correctly', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,US
Jane,Smith,jane@example.com,GB
Bob,Johnson,bob@example.com,INVALID
Alice,Williams,alice@example.com,840
Charlie,Brown,charlie@example.com,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(5)
    
    // Valid country codes (US, GB, numeric 840 for US)
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[0].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
    
    expect(result[1].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[1].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
    
    expect(result[3].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[3].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
    
    // Invalid country code - should be warning status
    expect(result[2].validationStatus).toBe(ValidationStatus.Warning)
    expect(result[2].warnings).toContain(WARNING_INVALID_COUNTRY_CODE)
    
    // Empty country code should be valid (optional field)
    expect(result[4].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[4].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
  })

  it('should handle alpha-3 country codes', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,USA
Jane,Smith,jane@example.com,GBR`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    
    // Valid alpha-3 codes
    expect(result[0].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[0].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
    
    expect(result[1].validationStatus).toBe(ValidationStatus.Valid)
    expect(result[1].warnings).not.toContain(WARNING_INVALID_COUNTRY_CODE)
  })

  it('should be invalid if country code is invalid and required field is invalid', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@examplecom,XXX
John,,john@example.com,XXX
,Smith,jane@example.com,XXX`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    
    expect(result[0].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[0].warnings).toContain(WARNING_INVALID_COUNTRY_CODE)
    
    expect(result[1].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[1].warnings).toContain(WARNING_INVALID_COUNTRY_CODE)

    expect(result[0].validationStatus).toBe(ValidationStatus.Invalid)
    expect(result[0].warnings).toContain(WARNING_INVALID_COUNTRY_CODE)
  })
})
