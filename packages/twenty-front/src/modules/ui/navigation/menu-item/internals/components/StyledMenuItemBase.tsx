import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { HOVER_BACKGROUND } from '@/ui/theme/constants/HoverBackground';

import { MenuItemAccent } from '../../types/MenuItemAccent';

export type MenuItemBaseProps = {
  accent?: MenuItemAccent;
  isKeySelected?: boolean;
};

export const StyledMenuItemBase = styled.li<MenuItemBaseProps>`
  --horizontal-padding: ${({ theme }) => theme.spacing(1)};
  --vertical-padding: ${({ theme }) => theme.spacing(2)};

  align-items: center;

  border-radius: ${({ theme }) => theme.border.radius.sm};
  cursor: pointer;

  display: flex;

  flex-direction: row;

  font-size: ${({ theme }) => theme.font.size.sm};

  gap: ${({ theme }) => theme.spacing(2)};

  height: calc(32px - 2 * var(--vertical-padding));
  justify-content: space-between;

  padding: var(--vertical-padding) var(--horizontal-padding);

  ${HOVER_BACKGROUND};

  ${({ theme, accent }) => {
    switch (accent) {
      case 'danger': {
        return css`
          color: ${theme.font.color.danger};
          &:hover {
            background: ${theme.background.transparent.danger};
          }
        `;
      }
      case 'placeholder': {
        return css`
          color: ${theme.font.color.tertiary};
        `;
      }
      case 'default':
      default: {
        return css`
          color: ${theme.font.color.secondary};
        `;
      }
    }
  }}

  position: relative;
  user-select: none;

  width: calc(100% - 2 * var(--horizontal-padding));
`;

export const StyledMenuItemLabel = styled.div<{ hasLeftIcon: boolean }>`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.regular};

  overflow: hidden;
  padding-left: ${({ theme, hasLeftIcon }) =>
    hasLeftIcon ? '' : theme.spacing(1)};

  white-space: nowrap;
`;

export const StyledNoIconFiller = styled.div`
  width: ${({ theme }) => theme.spacing(1)};
`;

export const StyledMenuItemLeftContent = styled.div`
  align-items: center;
  display: flex;

  flex-direction: row;

  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  width: 100%;

  & > svg {
    flex-shrink: 0;
  }
`;

export const StyledMenuItemRightContent = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

export const StyledHoverableMenuItemBase = styled(StyledMenuItemBase)<{
  isMenuOpen: boolean;
}>`
  & .hoverable-buttons {
    pointer-events: none;
    position: fixed;
    right: ${({ theme }) => theme.spacing(2)};
    transition: opacity ${({ theme }) => theme.animation.duration.instant}s ease;
  }

  &:hover {
    & .hoverable-buttons {
      pointer-events: auto;
      position: static;
    }
  }
`;
