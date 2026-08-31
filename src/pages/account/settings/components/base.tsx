import { UploadOutlined } from '@ant-design/icons';
import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, message, Upload } from 'antd';
import type React from 'react';
import { getAuthErrorDetails } from '@/services/auth';
import { normalizeAuthCurrentUser } from '@/services/auth-session';
import { updateCurrentUserProfile } from '@/services/jushu-api/currentUser';
import { resolveUserAvatarUrl } from '@/utils/userAvatar';
import useStyles from './index.style';

type BaseFormValues = {
  name?: string;
};

const BaseView: React.FC = () => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  const handleFinish = async (values: BaseFormValues) => {
    try {
      const response = await updateCurrentUserProfile({ name: values.name });
      await setInitialState((state) => ({
        ...state,
        // Legacy 资料接口仍返回旧授权字段，写回全局状态前必须经过认证适配层。
        currentUser: normalizeAuthCurrentUser({
          source: 'legacy',
          currentUser: response.data,
        }),
      }));
      message.success('更新基本信息成功');
    } catch (error) {
      const { message: errorMessage } = getAuthErrorDetails(error);
      message.error(errorMessage || '更新基本信息失败');
    }
  };

  if (!currentUser) return null;

  return (
    <div className={styles.baseView}>
      <div className={styles.left}>
        <ProForm
          layout="vertical"
          onFinish={handleFinish}
          submitter={{
            searchConfig: { submitText: '更新基本信息' },
            render: (_, dom) => dom[1],
          }}
          initialValues={{
            email: currentUser.email,
            name: currentUser.name,
          }}
          requiredMark={false}
        >
          <ProFormText
            width="md"
            name="email"
            label="邮箱"
            disabled
            fieldProps={{ readOnly: true }}
          />
          <ProFormText
            width="md"
            name="name"
            label="昵称"
            rules={[{ required: true, message: '请输入您的昵称!' }]}
          />
          <ProFormTextArea
            name="signature"
            label="签名"
            placeholder="待开发"
            disabled
          />
          <ProFormText
            width="md"
            name="phone"
            label="手机号"
            placeholder="待开发"
            disabled
          />
        </ProForm>
      </div>
      <div className={styles.right}>
        <AvatarView avatar={resolveUserAvatarUrl(currentUser.avatar)} />
      </div>
    </div>
  );
};

const AvatarView = ({ avatar }: { avatar: string }) => {
  const { styles } = useStyles();

  return (
    <>
      <div className={styles.avatar_title}>头像</div>
      <div className={styles.avatar}>
        <img src={avatar} alt="avatar" />
      </div>
      <Upload showUploadList={false} disabled>
        <div className={styles.button_view}>
          <Button disabled>
            <UploadOutlined />
            更换头像（待开发）
          </Button>
        </div>
      </Upload>
    </>
  );
};

export default BaseView;
