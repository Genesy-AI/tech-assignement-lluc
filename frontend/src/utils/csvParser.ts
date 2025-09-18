import Papa from 'papaparse'
import { isValid, numericToAlpha2 } from 'i18n-iso-countries'

export enum ValidationStatus {
  Valid = 'valid',
  Invalid = 'invalid',
  Warning = 'warning'
}

export interface CsvLead {
  firstName: string
  lastName: string
  email: string
  jobTitle?: string
  countryCode?: string
  companyName?: string
  validationStatus: ValidationStatus
  errors: string[]
  warnings: string[]
  rowIndex: number
}

export const ERROR_FIRST_NAME_REQUIRED = 'First name is required'
export const ERROR_LAST_NAME_REQUIRED = 'Last name is required'
export const ERROR_EMAIL_REQUIRED = 'Email is required'
export const ERROR_INVALID_EMAIL_FORMAT = 'Invalid email format'
export const WARNING_INVALID_COUNTRY_CODE = 'Invalid country code (will be left empty)'

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const convertIfNumeric = (countryCode: string): string => {
  const numericCode = parseInt(countryCode)
  if (!isNaN(numericCode)) {
    const paddedCode = numericCode.toString().padStart(3, '0')
    if (isValid(paddedCode)) {
      return numericToAlpha2(paddedCode)!;
    }
  }

  return countryCode;
}

const isValidCountryCode = (countryCode: string): boolean => isValid(countryCode);

export const parseCsv = (content: string): CsvLead[] => {
  if (!content?.trim()) {
    throw new Error('CSV content cannot be empty')
  }

  const parseResult = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim().toLowerCase(),
    quoteChar: '"',
  })

  if (parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(
      (error) => error.type === 'Delimiter' || error.type === 'Quotes' || error.type === 'FieldMismatch'
    )
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`)
    }
  }

  if (!parseResult.data || parseResult.data.length === 0) {
    throw new Error('CSV file appears to be empty or contains no valid data')
  }

  const data: CsvLead[] = []

  parseResult.data.forEach((row, index) => {
    if (Object.values(row).every((value) => !value)) return

    const lead: Partial<CsvLead> = { rowIndex: index + 2 }

    Object.entries(row).forEach(([header, value]) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '')
      const trimmedValue = value?.trim() || ''

      switch (normalizedHeader) {
        case 'firstname':
          lead.firstName = trimmedValue
          break
        case 'lastname':
          lead.lastName = trimmedValue
          break
        case 'email':
          lead.email = trimmedValue
          break
        case 'jobtitle':
          lead.jobTitle = trimmedValue || undefined
          break
        case 'countrycode':
          lead.countryCode = convertIfNumeric(trimmedValue) || undefined
          break
        case 'companyname':
          lead.companyName = trimmedValue || undefined
          break
      }
    })

    const errors: string[] = []
    const warnings: string[] = []
    if (!lead.firstName?.trim()) {
      errors.push(ERROR_FIRST_NAME_REQUIRED)
    }
    if (!lead.lastName?.trim()) {
      errors.push(ERROR_LAST_NAME_REQUIRED)
    }
    if (!lead.email?.trim()) {
      errors.push(ERROR_EMAIL_REQUIRED)
    } else if (!isValidEmail(lead.email)) {
      errors.push(ERROR_INVALID_EMAIL_FORMAT)
    }
    if (lead.countryCode && !isValidCountryCode(lead.countryCode)) {
      warnings.push(WARNING_INVALID_COUNTRY_CODE)
    }

    // Determine validation status based on errors and warnings
    let validationStatus: ValidationStatus
    if (errors.length > 0) {
      validationStatus = ValidationStatus.Invalid
    } else if (warnings.length > 0) {
      validationStatus = ValidationStatus.Warning
    } else {
      validationStatus = ValidationStatus.Valid
    }

    data.push({
      ...lead,
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      validationStatus,
      errors,
      warnings,
    } as CsvLead)
  })

  return data
}
