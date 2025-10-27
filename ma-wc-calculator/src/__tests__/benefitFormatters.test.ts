import {
  getBenefitTitle,
  getBenefitShortLabel,
  getBenefitDescription,
  formatBenefitWithRate
} from '../utils/benefitFormatters';

describe('benefitFormatters', () => {
  describe('getBenefitTitle', () => {
    it('should return correct title for Section 34', () => {
      expect(getBenefitTitle('34')).toBe('Section 34 (TTD)');
    });

    it('should return correct title for Section 35', () => {
      expect(getBenefitTitle('35')).toBe('Section 35 (TPD)');
    });

    it('should return correct title for Section 35 EC', () => {
      expect(getBenefitTitle('35ec')).toBe('Section 35 EC');
    });

    it('should return correct title for Section 34A', () => {
      expect(getBenefitTitle('34A')).toBe('Section 34A (P&T)');
    });

    it('should return correct title for Section 31', () => {
      expect(getBenefitTitle('31')).toBe('Section 31 (Dependent)');
    });

    it('should return the type as-is for unknown types', () => {
      expect(getBenefitTitle('unknown')).toBe('unknown');
    });
  });

  describe('getBenefitShortLabel', () => {
    it('should return short labels for all known types', () => {
      expect(getBenefitShortLabel('34')).toBe('S34');
      expect(getBenefitShortLabel('35')).toBe('S35');
      expect(getBenefitShortLabel('35ec')).toBe('S35 EC');
      expect(getBenefitShortLabel('34A')).toBe('S34A');
      expect(getBenefitShortLabel('31')).toBe('S31');
    });

    it('should return type as-is for unknown types', () => {
      expect(getBenefitShortLabel('unknown')).toBe('unknown');
    });
  });

  describe('getBenefitDescription', () => {
    it('should return full descriptions for all known types', () => {
      expect(getBenefitDescription('34')).toBe('Temporary Total Disability');
      expect(getBenefitDescription('35')).toBe('Temporary Partial Disability');
      expect(getBenefitDescription('35ec')).toBe('Temporary Partial Disability with Earning Capacity');
      expect(getBenefitDescription('34A')).toBe('Permanent and Total Disability');
      expect(getBenefitDescription('31')).toBe('Widow/Dependent Benefits');
    });

    it('should return type as-is for unknown types', () => {
      expect(getBenefitDescription('unknown')).toBe('unknown');
    });
  });

  describe('formatBenefitWithRate', () => {
    it('should format benefit with rate correctly', () => {
      const result = formatBenefitWithRate('34', 600);
      expect(result).toContain('Section 34');
      expect(result).toContain('$600.00');
    });

    it('should handle zero rate', () => {
      const result = formatBenefitWithRate('35', 0);
      expect(result).toContain('Section 35');
      expect(result).toContain('$0.00');
    });

    it('should handle decimal rates', () => {
      const result = formatBenefitWithRate('35ec', 450.75);
      expect(result).toContain('Section 35 EC');
      expect(result).toContain('$450.75');
    });

    it('should work with unknown types', () => {
      const result = formatBenefitWithRate('unknown', 100);
      expect(result).toContain('unknown');
      expect(result).toContain('$100.00');
    });
  });
});
