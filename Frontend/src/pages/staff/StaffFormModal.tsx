import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, PasswordInput, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { staffFormSchema, staffUpdateFormSchema } from '../../lib/validation';
import type { StaffInput, User } from '../../types';

interface StaffFormValues {
  name: string;
  email: string;
  password: string;
  role: StaffInput['role'];
}

const initialValues: StaffFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'STAFF'
};

interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  user?: User | null;
}

export function StaffFormModal({ open, onClose, onSaved, user = null }: StaffFormModalProps) {
  const {
    values,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    setValue,
    reset
  } = useFormState<StaffFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      reset(
        user
          ? { name: user.name, email: user.email, password: '', role: 'STAFF' }
          : initialValues
      );
    }
  }, [open, reset, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = user
      ? staffUpdateFormSchema.safeParse({ name: values.name, email: values.email })
      : staffFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (user) {
        const updateResult = staffUpdateFormSchema.safeParse({
          name: values.name,
          email: values.email
        });
        if (!updateResult.success) {
          setErrors(zodFieldErrors(updateResult.error));
          setFormError('Review the highlighted fields and try again.');
          return;
        }
        await api.users.update(user.id, updateResult.data);
        onSaved('Staff account updated');
      } else {
        const createResult = staffFormSchema.safeParse(values);
        if (!createResult.success) {
          setErrors(zodFieldErrors(createResult.error));
          setFormError('Review the highlighted fields and try again.');
          return;
        }
        await api.users.create({
          name: createResult.data.name,
          email: createResult.data.email,
          password: createResult.data.password,
          role: createResult.data.role
        });
        onSaved('Team account created');
      }
      onClose();
    } catch (caught) {
      setErrors(apiFieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Edit staff member' : 'Add a team member'}
      description={
        user
          ? 'Update the staff member’s name or email address.'
          : 'Create a staff or administrator account. Only administrators can do this.'
      }
      size="md"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={submitting}>
            {user ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="staff-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="form-grid">
          <Input
            label="Full name"
            name="name"
            autoComplete="name"
            placeholder="Jordan Lee"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            error={errors.name}
            data-autofocus
            required
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jordan@company.com"
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            error={errors.email}
            required
          />
        </div>

        {!user && (
          <>
            <Select
              label="Role"
              name="role"
              value={values.role}
              onChange={(event) =>
                setValue('role', event.target.value as StaffInput['role'])
              }
              error={errors.role}
              hint="Administrators have full access. Staff can manage plans and view products."
              required
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Administrator</option>
            </Select>

            <PasswordInput
              label="Temporary password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={values.password}
              onChange={(event) => setValue('password', event.target.value)}
              error={errors.password}
              hint="Share this securely with the new team member."
              required
            />

            <PasswordChecklist value={values.password} />
          </>
        )}
      </form>
    </Modal>
  );
}
