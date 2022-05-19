import { darkPallet } from '@webb-dapp/ui-components/styling/colors';
import { createGlobalStyle } from 'styled-components';

export const DarkTheme = createGlobalStyle`
	:root {
		--color-primary: #3e5bf8;
		--color-primary-light: #2f3db5;
		--color-primary-hover: #2f53c8;
		--color-primary-active: #0c30ae;

		--color-blue: #108ee9;
		--color-green: #48b87e;
		--color-red: #e02020;
		--color-red-light: #ff5a5a;
		--color-yellow: #f0fa41;
		--color-orange: #f7b500;
		--color-white: #000;
		--color-gray: #cccccc;
		--color-red-light: #ff5a5a;

		--color-success: var(--color-green);
		--color-error: var(--color-red);
		--color-alert: var(--color-yellow);
		--color-info: var(--color-blue);
		--color-warning: var(--color-orange);

		--accent-color: ${darkPallet.accentColor};
		--border-color: #e9e9e9;
		--dividing-color: #ecf0f2;

		--text-size-sm: 14px;
		--text-size-md: 16px;
		--text-size-lg: 18px;
		--text-size-xl: 24px;

		--text-weight-light: 400;
		--text-weight-md: 500;

		--text-color-black: #fff;
		--text-color-white: #ffffff;
		--text-color-primary: #eee;
		--text-color-normal: #eaeaea;
		--text-color-second: #999999;

		--blend-3: rgba(0, 0, 0, 0.03);
		--blend-10: rgba(0, 0, 0, 0.1);

		--light-3: rgba(255, 255, 255, 0.03);
		--light-10: rgba(255, 255, 255, 0.1);

		--screen-small: 960px;
		--screen-middle: 1440px;
		--screen-large: 1920px;

		--tab-border: #eee;

		--card-shadow: 0 1px 20px 0 rgba(23, 65, 212, 0.02);

		--sidebar-item-height: 58px;

		--platform-background: ${darkPallet.background};
		--card-background: ${darkPallet.cardBackground};
		--menu-background: ${darkPallet.menuBackground};

		--information-background: rgba(0, 0, 0, 0.4);
		--information-title-color: #0155ff;
		--information-content-color: #95addc;
		--color-border: var(--platform-background);
		--notification-success-color: #8fce65;
		--notification-info-color: #108ee9;
		--notification-warning-color: #f0af41;
		--notification-error-color: #f35600;

		--notification-message-color: #404040;
		--notification-description-color: #666666;


		--table-striped-background: #222121;
		--list-item-background: linear-gradient(90deg, #151414 0%, #0c0c0c 100%) #000;
		--input-border-color: rgba(1, 85, 255, 1);
		--input-shadow: rgba(1, 85, 255, 0.2);
		--input-border-color-error: rgba(255, 90, 90, 1);
		--input-shadow-error: rgba(255, 90, 90, 0.2);
	}

	.active-menu-item {
		path: {
			fill: ${darkPallet.accentColor};
		}
	}

	/* overwrite ant style */
	.ant-steps-item-process .ant-steps-item-icon {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.ant-steps-item-finish .ant-steps-item-icon {
		border-color: var(--color-primary);
	}

	.ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon {
		color: var(--color-primary);
	}

	.ant-dropdown-menu {
		border-radius: 12px;
	}

	body {
		background: ${darkPallet.componentBackground} !important;
	}
`;
