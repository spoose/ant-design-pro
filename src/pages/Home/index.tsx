import { PageContainer } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { CurrentAccessOverview } from '@/components/CurrentAccessOverview';

const Home: React.FC = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  // 用户、Context、权限和 Skill 均来自 GET /api/currentUser，并在当前登录生命周期内共享。
  const currentContext = initialState?.currentUser?.contexts.find(
    (context) => context.id === initialState.currentContextId,
  );

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'menu.home', defaultMessage: '首页' })}
    >
      {currentContext ? (
        <CurrentAccessOverview context={currentContext} />
      ) : (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          未找到当前系统上下文
        </div>
      )}
    </PageContainer>
  );
};

export default Home;
